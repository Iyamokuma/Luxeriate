-- ============================================================================
-- Luxuriate Foodstuff — business logic
-- Every state change that involves money happens inside one of these
-- functions, in one transaction, so the books can never half-update.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Small helpers
-- ---------------------------------------------------------------------------
create or replace function public.lagos_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Africa/Lagos')::date;
$$;

create or replace function public.late_grace_days()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select late_grace_days from public.app_settings where id = 1), 7)::integer;
$$;

-- paid | late | due | upcoming | cancelled
create or replace function public.installment_state(
  p_paid_at timestamptz,
  p_due_date date,
  p_enrollment_status public.enrollment_status
)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_paid_at is not null then 'paid'
    when p_enrollment_status = 'cancelled' then 'cancelled'
    when p_due_date + public.late_grace_days() < public.lagos_today() then 'late'
    when date_trunc('month', p_due_date) <= date_trunc('month', public.lagos_today()::timestamp) then 'due'
    else 'upcoming'
  end;
$$;

create or replace function public.next_counter(p_scope text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_value bigint;
begin
  insert into public.code_counters as c (scope, last_value)
  values (p_scope, 1)
  on conflict (scope) do update set last_value = c.last_value + 1
  returning last_value into v_value;
  return v_value;
end;
$$;

-- FUNMI2027, then FUNMI2027B, FUNMI2027C ...
create or replace function public.generate_referral_code(p_full_name text, p_year integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base text;
  v_code text;
  v_n integer := 0;
begin
  v_base := upper(regexp_replace(split_part(trim(coalesce(p_full_name, '')), ' ', 1), '[^A-Za-z]', '', 'g'));
  if length(v_base) < 2 then
    v_base := 'LUX';
  end if;
  v_base := left(v_base, 10);
  v_code := v_base || p_year::text;
  while exists (select 1 from public.enrollments where referral_code = v_code) loop
    v_n := v_n + 1;
    if v_n <= 25 then
      v_code := v_base || p_year::text || chr(65 + v_n);
    else
      v_code := v_base || p_year::text || upper(substr(md5(random()::text), 1, 3));
    end if;
  end loop;
  return v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Roles & permissions
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role in ('staff', 'owner')
      and is_active
  );
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'owner' and is_active
  );
$$;

create or replace function public.has_perm(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and is_active
      and (role = 'owner' or (role = 'staff' and p_permission = any (permissions)))
  );
$$;

create or replace function public.require_perm(p_permission text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  -- service_role calls (no end user) are trusted server code
  if (select auth.role()) = 'service_role' then
    return;
  end if;
  if not public.has_perm(p_permission) then
    raise exception 'FORBIDDEN' using errcode = '42501', detail = p_permission;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Activity log (actor is always the signed-in user, never client supplied)
-- ---------------------------------------------------------------------------
create or replace function public.log_activity(
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_summary text,
  p_details jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_name text;
begin
  if v_actor is not null and not public.is_staff() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  select full_name into v_name from public.profiles where id = v_actor;
  insert into public.activity_log (actor_id, actor_name, action, entity_type, entity_id, summary, details)
  values (v_actor, coalesce(v_name, 'System'), p_action, p_entity_type, p_entity_id, p_summary, p_details);
end;
$$;

-- ---------------------------------------------------------------------------
-- New auth user → profile. Role is always customer; it is never read from
-- user metadata, so nobody can sign themselves up as staff.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = coalesce(new.email, '') where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- ---------------------------------------------------------------------------
-- Referral lookup used on the public registration form
-- ---------------------------------------------------------------------------
create or replace function public.validate_referral_code(p_code text)
returns table (referrer_name text, package_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    trim(split_part(pr.full_name, ' ', 1) || ' ' || left(split_part(pr.full_name, ' ', 2), 1)
      || case when split_part(pr.full_name, ' ', 2) <> '' then '.' else '' end) as referrer_name,
    p.name as package_name
  from public.enrollments e
  join public.profiles pr on pr.id = e.user_id
  join public.packages p on p.id = e.package_id
  where e.referral_code = upper(trim(p_code))
    and e.status in ('active', 'completed')
  limit 1;
$$;

-- People a customer has referred (first names only)
create or replace function public.my_referrals()
returns table (
  referral_code text,
  first_name text,
  package_name text,
  status public.enrollment_status,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    mine.referral_code,
    split_part(pr.full_name, ' ', 1),
    p.name,
    e.status,
    coalesce(e.activated_at, e.created_at)
  from public.enrollments mine
  join public.enrollments e on e.referred_by_enrollment_id = mine.id
  join public.profiles pr on pr.id = e.user_id
  join public.packages p on p.id = e.package_id
  where mine.user_id = (select auth.uid())
    and e.status <> 'cancelled'
  order by coalesce(e.activated_at, e.created_at) desc;
$$;

-- ---------------------------------------------------------------------------
-- Enrollment creation (called by the server during registration)
-- ---------------------------------------------------------------------------
create or replace function public.create_enrollment(
  p_user_id uuid,
  p_package_id uuid,
  p_collection_point_id uuid,
  p_referral_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pkg public.packages%rowtype;
  v_ref_id uuid;
  v_id uuid;
  v_period date;
  v_last_day integer;
  i integer;
begin
  select * into v_pkg from public.packages where id = p_package_id;
  if not found then
    raise exception 'PACKAGE_NOT_FOUND' using errcode = 'P0001';
  end if;
  if not v_pkg.is_open then
    raise exception 'PACKAGE_CLOSED' using errcode = 'P0001';
  end if;
  if p_collection_point_id is null
     or not exists (select 1 from public.collection_points where id = p_collection_point_id and is_active) then
    raise exception 'COLLECTION_POINT_INVALID' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.enrollments
    where user_id = p_user_id and package_id = p_package_id and status <> 'cancelled'
  ) then
    raise exception 'ALREADY_ENROLLED' using errcode = 'P0001';
  end if;

  if nullif(trim(coalesce(p_referral_code, '')), '') is not null then
    select id into v_ref_id
    from public.enrollments
    where referral_code = upper(trim(p_referral_code))
      and status in ('active', 'completed')
      and user_id <> p_user_id
    limit 1;
    if v_ref_id is null then
      raise exception 'REFERRAL_INVALID' using errcode = 'P0001';
    end if;
  end if;

  insert into public.enrollments (
    user_id, package_id, collection_point_id, referred_by_enrollment_id,
    monthly_amount_kobo, registration_fee_kobo, savings_return_kobo, duration_months
  ) values (
    p_user_id, p_package_id, p_collection_point_id, v_ref_id,
    v_pkg.monthly_amount_kobo, v_pkg.registration_fee_kobo, v_pkg.savings_return_kobo, v_pkg.duration_months
  )
  returning id into v_id;

  for i in 1 .. v_pkg.duration_months loop
    v_period := (v_pkg.start_month + make_interval(months => i - 1))::date;
    v_last_day := extract(day from (date_trunc('month', v_period::timestamp) + interval '1 month - 1 day'))::integer;
    insert into public.installments (enrollment_id, month_index, period_month, due_date, amount_kobo)
    values (
      v_id, i, v_period,
      make_date(extract(year from v_period)::integer, extract(month from v_period)::integer, least(v_pkg.due_day::integer, v_last_day)),
      v_pkg.monthly_amount_kobo
    );
  end loop;

  insert into public.enrollment_events (enrollment_id, kind, title, body)
  values (v_id, 'registered', 'Registration started', 'You chose the ' || v_pkg.name || ' package.');

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Prepare a payment. The amount is always computed here, on the server,
-- from the schedule. The browser never decides how much to charge.
-- ---------------------------------------------------------------------------
create or replace function public.prepare_payment(
  p_enrollment_id uuid,
  p_user_id uuid,
  p_months integer,
  p_provider public.payment_provider default 'paystack'
)
returns table (
  payment_id uuid,
  reference text,
  amount_kobo bigint,
  email text,
  includes_registration boolean,
  months integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.enrollments%rowtype;
  v_months integer;
  v_unpaid integer;
  v_reg boolean;
  v_amount bigint;
  v_ref text;
  v_id uuid;
  v_email text;
begin
  if p_months is null or p_months < 1 or p_months > 24 then
    raise exception 'INVALID_MONTHS' using errcode = 'P0001';
  end if;

  select * into e from public.enrollments where id = p_enrollment_id for update;
  if not found or (p_user_id is not null and e.user_id <> p_user_id) then
    raise exception 'ENROLLMENT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if e.status in ('completed', 'cancelled') then
    raise exception 'ENROLLMENT_CLOSED' using errcode = 'P0001';
  end if;

  select count(*) into v_unpaid from public.installments where enrollment_id = e.id and paid_at is null;
  v_reg := e.registration_paid_at is null;
  v_months := least(p_months, v_unpaid);

  if v_months = 0 and not v_reg then
    raise exception 'NOTHING_DUE' using errcode = 'P0001';
  end if;

  select coalesce(sum(s.amount_kobo), 0) into v_amount
  from (
    select i.amount_kobo from public.installments i
    where i.enrollment_id = e.id and i.paid_at is null
    order by i.month_index
    limit v_months
  ) s;

  v_amount := v_amount + case when v_reg then e.registration_fee_kobo else 0 end - e.credit_kobo;
  if v_amount < 100 then
    -- Paystack's minimum; credit should never be this large, but be safe
    v_amount := 100;
  end if;

  v_ref := 'LUX-' || to_char(now() at time zone 'Africa/Lagos', 'YYMMDD') || '-'
        || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  select pr.email into v_email from public.profiles pr where pr.id = e.user_id;

  insert into public.payments (
    reference, enrollment_id, user_id, provider, status,
    expected_amount_kobo, amount_kobo, includes_registration, months_requested
  ) values (
    v_ref, e.id, e.user_id, p_provider, 'pending',
    v_amount, v_amount, v_reg, v_months
  )
  returning id into v_id;

  return query select v_id, v_ref, v_amount, v_email, v_reg, v_months;
end;
$$;

-- ---------------------------------------------------------------------------
-- Finalize a payment once the gateway has confirmed it.
-- Idempotent: running it twice for the same reference changes nothing the
-- second time, so the webhook and the browser callback can race safely.
-- ---------------------------------------------------------------------------
create or replace function public.finalize_payment(
  p_reference text,
  p_amount_kobo bigint,
  p_paid_at timestamptz default now(),
  p_channel text default null,
  p_gateway_transaction_id bigint default null,
  p_fees_kobo bigint default null,
  p_gateway_response text default null,
  p_raw jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  p public.payments%rowtype;
  e public.enrollments%rowtype;
  v_pkg public.packages%rowtype;
  inst record;
  v_available bigint;
  v_months integer := 0;
  v_labels text[] := '{}';
  v_reg_paid boolean := false;
  v_activated boolean := false;
  v_completed boolean := false;
  v_review boolean := false;
  v_receipt text;
  v_year integer;
  v_unpaid integer;
  v_paid_kobo bigint;
  v_paid_count integer;
  v_customer_code text;
  v_referral_code text;
  v_full_name text;
  v_email text;
  v_next_due date;
  v_naira text;
begin
  select * into p from public.payments where reference = p_reference for update;
  if not found then
    raise exception 'PAYMENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  if p.status = 'success' then
    return jsonb_build_object('processed', false, 'reason', 'already_processed', 'payment_id', p.id);
  end if;

  if p_amount_kobo is null or p_amount_kobo <= 0 then
    raise exception 'INVALID_AMOUNT' using errcode = 'P0001';
  end if;

  select * into e from public.enrollments where id = p.enrollment_id for update;
  select * into v_pkg from public.packages where id = e.package_id;
  select full_name, email into v_full_name, v_email from public.profiles where id = e.user_id;

  v_available := p_amount_kobo + e.credit_kobo;
  v_review := (p_amount_kobo <> p.expected_amount_kobo) or e.status = 'cancelled';

  if e.credit_kobo > 0 then
    insert into public.payment_lines (payment_id, enrollment_id, line_type, amount_kobo, description)
    values (p.id, e.id, 'credit', -e.credit_kobo, 'Applied from earlier credit');
  end if;

  -- 1. Registration fee, recorded on its own line
  if e.status <> 'cancelled' and e.registration_paid_at is null and v_available >= e.registration_fee_kobo then
    if e.registration_fee_kobo > 0 then
      insert into public.payment_lines (payment_id, enrollment_id, line_type, amount_kobo, description)
      values (p.id, e.id, 'registration_fee', e.registration_fee_kobo, 'Registration fee');
    end if;
    v_available := v_available - e.registration_fee_kobo;
    v_reg_paid := true;
    e.registration_paid_at := p_paid_at;
  end if;

  -- 2. Contributions, oldest unpaid month first
  if e.status <> 'cancelled' and e.registration_paid_at is not null then
    for inst in
      select * from public.installments
      where enrollment_id = e.id and paid_at is null
      order by month_index
      for update
    loop
      exit when v_available < inst.amount_kobo;
      update public.installments set paid_at = p_paid_at, payment_id = p.id where id = inst.id;
      insert into public.payment_lines (payment_id, enrollment_id, installment_id, line_type, amount_kobo, description)
      values (p.id, e.id, inst.id, 'contribution', inst.amount_kobo, to_char(inst.period_month, 'FMMonth YYYY') || ' contribution');
      v_available := v_available - inst.amount_kobo;
      v_months := v_months + 1;
      v_labels := v_labels || to_char(inst.period_month, 'FMMonth YYYY');
    end loop;
  end if;

  -- 3. Anything left over is held as credit (and flagged when unexpected)
  if v_available > 0 then
    insert into public.payment_lines (payment_id, enrollment_id, line_type, amount_kobo, description)
    values (p.id, e.id, 'credit', v_available, 'Held as credit towards the next month');
    if p.provider not in ('paystack_dva') then
      v_review := true;
    end if;
  end if;

  update public.enrollments
  set credit_kobo = v_available,
      registration_paid_at = e.registration_paid_at
  where id = e.id;

  v_year := extract(year from (p_paid_at at time zone 'Africa/Lagos'))::integer;
  v_receipt := 'RCP-' || v_year::text || '-' || lpad(public.next_counter('receipt:' || v_year::text)::text, 6, '0');

  update public.payments
  set status = 'success',
      amount_kobo = p_amount_kobo,
      paid_at = p_paid_at,
      channel = coalesce(p_channel, channel),
      gateway_transaction_id = coalesce(p_gateway_transaction_id, gateway_transaction_id),
      fees_kobo = coalesce(p_fees_kobo, fees_kobo),
      gateway_response = coalesce(p_gateway_response, gateway_response),
      raw = coalesce(p_raw, raw),
      receipt_number = v_receipt,
      needs_review = v_review
  where id = p.id;

  -- 4. Activate on the first confirmed payment
  if e.status = 'pending_payment' and e.registration_paid_at is not null then
    v_customer_code := 'LUX-' || v_pkg.cycle_year::text || '-'
                    || lpad(public.next_counter('customer:' || v_pkg.cycle_year::text)::text, 6, '0');
    v_referral_code := public.generate_referral_code(v_full_name, v_pkg.cycle_year);
    update public.enrollments
    set status = 'active',
        activated_at = now(),
        customer_code = v_customer_code,
        referral_code = v_referral_code
    where id = e.id;
    v_activated := true;
    e.status := 'active';
    insert into public.enrollment_events (enrollment_id, kind, title, body)
    values (e.id, 'activated', 'Welcome to Luxuriate', 'Your customer ID is ' || v_customer_code || '.');
  else
    v_customer_code := e.customer_code;
    v_referral_code := e.referral_code;
  end if;

  v_naira := to_char(p_amount_kobo / 100.0, 'FM999,999,999,990');
  insert into public.enrollment_events (enrollment_id, kind, title, body)
  values (
    e.id, 'payment', 'Payment received: ₦' || v_naira,
    case
      when v_months > 0 then array_to_string(v_labels, ', ')
        || case when v_reg_paid then ' and registration fee' else '' end
      when v_reg_paid then 'Registration fee'
      else 'Held as credit'
    end
  );

  -- 5. Completion straight after the final month
  select count(*) filter (where paid_at is null),
         count(*) filter (where paid_at is not null),
         coalesce(sum(amount_kobo) filter (where paid_at is not null), 0),
         min(due_date) filter (where paid_at is null)
  into v_unpaid, v_paid_count, v_paid_kobo, v_next_due
  from public.installments where enrollment_id = e.id;

  if v_unpaid = 0 and e.status = 'active' then
    update public.enrollments
    set status = 'completed',
        completed_at = now(),
        savings_return_status = case when savings_return_kobo > 0 then 'pending'::public.savings_return_status
                                     else 'not_applicable'::public.savings_return_status end
    where id = e.id;
    v_completed := true;
    insert into public.enrollment_events (enrollment_id, kind, title, body)
    values (e.id, 'completed', 'Contributions completed',
            'Every month is paid. We will let you know as your package is prepared.');
  end if;

  return jsonb_build_object(
    'processed', true,
    'payment_id', p.id,
    'reference', p.reference,
    'enrollment_id', e.id,
    'user_id', e.user_id,
    'email', v_email,
    'full_name', v_full_name,
    'package_name', v_pkg.name,
    'amount_kobo', p_amount_kobo,
    'registration_paid', v_reg_paid,
    'months_paid', v_months,
    'month_labels', to_jsonb(v_labels),
    'paid_count', v_paid_count,
    'duration_months', e.duration_months,
    'paid_kobo', v_paid_kobo,
    'total_kobo', e.monthly_amount_kobo * e.duration_months,
    'balance_kobo', e.monthly_amount_kobo * e.duration_months - v_paid_kobo,
    'next_due_date', v_next_due,
    'activated', v_activated,
    'completed', v_completed,
    'customer_code', v_customer_code,
    'referral_code', v_referral_code,
    'receipt_number', v_receipt,
    'needs_review', v_review
  );
end;
$$;

create or replace function public.mark_payment_unsuccessful(
  p_reference text,
  p_status public.payment_status,
  p_gateway_response text default null,
  p_raw jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('failed', 'abandoned') then
    raise exception 'INVALID_STATUS' using errcode = 'P0001';
  end if;
  update public.payments
  set status = p_status,
      gateway_response = coalesce(p_gateway_response, gateway_response),
      raw = coalesce(p_raw, raw)
  where reference = p_reference and status = 'pending';
end;
$$;

-- ---------------------------------------------------------------------------
-- Payment that arrives without a reference we created (dedicated account
-- transfer). Creates the payment row, then finalizes it.
-- ---------------------------------------------------------------------------
create or replace function public.record_external_payment(
  p_user_id uuid,
  p_reference text,
  p_amount_kobo bigint,
  p_provider public.payment_provider,
  p_paid_at timestamptz default now(),
  p_channel text default null,
  p_gateway_transaction_id bigint default null,
  p_fees_kobo bigint default null,
  p_raw jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_enrollment uuid;
begin
  if exists (select 1 from public.payments where reference = p_reference) then
    return public.finalize_payment(p_reference, p_amount_kobo, p_paid_at, p_channel, p_gateway_transaction_id, p_fees_kobo, null, p_raw);
  end if;

  select e.id into v_enrollment
  from public.enrollments e
  where e.user_id = p_user_id and e.status = 'active'
  order by e.created_at
  limit 1;

  if v_enrollment is null then
    select e.id into v_enrollment
    from public.enrollments e
    where e.user_id = p_user_id and e.status <> 'cancelled'
    order by e.created_at desc
    limit 1;
  end if;

  if v_enrollment is null then
    raise exception 'ENROLLMENT_NOT_FOUND' using errcode = 'P0001';
  end if;

  insert into public.payments (
    reference, enrollment_id, user_id, provider, status,
    expected_amount_kobo, amount_kobo, includes_registration, months_requested, channel
  ) values (
    p_reference, v_enrollment, p_user_id, p_provider, 'pending',
    p_amount_kobo, p_amount_kobo, true, 0, p_channel
  );

  return public.finalize_payment(p_reference, p_amount_kobo, p_paid_at, p_channel, p_gateway_transaction_id, p_fees_kobo, null, p_raw);
end;
$$;

-- ---------------------------------------------------------------------------
-- Offline payment recorded by an authorised staff member (owner by default)
-- ---------------------------------------------------------------------------
create or replace function public.record_manual_payment(
  p_enrollment_id uuid,
  p_months integer,
  p_note text,
  p_paid_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prep record;
  v_result jsonb;
begin
  perform public.require_perm('payments.record');
  if nullif(trim(coalesce(p_note, '')), '') is null then
    raise exception 'NOTE_REQUIRED' using errcode = 'P0001';
  end if;

  select * into v_prep from public.prepare_payment(p_enrollment_id, null, p_months, 'manual');

  update public.payments
  set note = p_note, recorded_by = (select auth.uid()), channel = 'offline'
  where id = v_prep.payment_id;

  v_result := public.finalize_payment(v_prep.reference, v_prep.amount_kobo, p_paid_at, 'offline', null, 0, 'Recorded by staff', null);

  perform public.log_activity(
    'payment.manual', 'enrollment', p_enrollment_id::text,
    'Recorded offline payment of ₦' || to_char(v_prep.amount_kobo / 100.0, 'FM999,999,999,990'),
    jsonb_build_object('reference', v_prep.reference, 'months', v_prep.months, 'note', p_note)
  );

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fulfilment: move completed packages through the collection steps
-- ---------------------------------------------------------------------------
create or replace function public.set_fulfilment_status(
  p_enrollment_ids uuid[],
  p_status public.fulfilment_status,
  p_scheduled_for timestamptz default null,
  p_note text default null
)
returns table (
  enrollment_id uuid,
  user_id uuid,
  email text,
  full_name text,
  customer_code text,
  package_name text,
  collection_point_name text,
  collection_point_address text,
  collection_scheduled_for timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_count integer;
  v_ids uuid[];
begin
  perform public.require_perm('fulfilment.manage');

  if p_status = 'collection_scheduled' and p_scheduled_for is null then
    raise exception 'SCHEDULE_REQUIRED' using errcode = 'P0001';
  end if;

  v_title := case p_status
    when 'preparing' then 'Your package is being prepared'
    when 'ready' then 'Your package is ready'
    when 'collection_scheduled' then 'Collection scheduled'
    when 'collected' then 'Package collected'
    else 'Package status updated'
  end;

  with updated as (
    update public.enrollments e
    set fulfilment_status = p_status,
        fulfilment_updated_at = now(),
        collection_scheduled_for = case when p_status = 'collection_scheduled' then p_scheduled_for
                                        else e.collection_scheduled_for end,
        fulfilment_note = coalesce(nullif(trim(coalesce(p_note, '')), ''), e.fulfilment_note)
    where e.id = any (p_enrollment_ids)
      and e.status = 'completed'
      and e.fulfilment_status is distinct from p_status
    returning e.id
  )
  select coalesce(array_agg(id), '{}') into v_ids from updated;

  v_count := coalesce(array_length(v_ids, 1), 0);
  if v_count = 0 then
    return;
  end if;

  insert into public.enrollment_events (enrollment_id, kind, title, body)
  select x, 'fulfilment:' || p_status::text, v_title,
         case when p_status = 'collection_scheduled'
              then 'Collection on ' || to_char(p_scheduled_for at time zone 'Africa/Lagos', 'FMDay, FMDD FMMonth YYYY "at" FMHH12:MI AM')
                   || coalesce('. ' || nullif(trim(coalesce(p_note, '')), ''), '')
              else nullif(trim(coalesce(p_note, '')), '') end
  from unnest(v_ids) as x;

  perform public.log_activity(
    'fulfilment.update', 'enrollment', null,
    'Moved ' || v_count || ' package' || case when v_count = 1 then '' else 's' end || ' to ' || replace(p_status::text, '_', ' '),
    jsonb_build_object('status', p_status, 'enrollment_ids', to_jsonb(v_ids), 'scheduled_for', p_scheduled_for)
  );

  return query
  select e.id, e.user_id, pr.email, pr.full_name, e.customer_code, p.name, cp.name, cp.address, e.collection_scheduled_for
  from public.enrollments e
  join public.profiles pr on pr.id = e.user_id
  join public.packages p on p.id = e.package_id
  left join public.collection_points cp on cp.id = e.collection_point_id
  where e.id = any (v_ids);
end;
$$;

-- ---------------------------------------------------------------------------
-- Savings return paid out (money is sent by the business, outside the app)
-- ---------------------------------------------------------------------------
create or replace function public.mark_savings_return_paid(
  p_enrollment_id uuid,
  p_reference text default null,
  p_paid_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  e public.enrollments%rowtype;
  v_email text;
  v_name text;
  v_pkg text;
begin
  perform public.require_perm('savings.manage');

  select * into e from public.enrollments where id = p_enrollment_id for update;
  if not found then
    raise exception 'ENROLLMENT_NOT_FOUND' using errcode = 'P0001';
  end if;
  if e.savings_return_status <> 'pending' then
    raise exception 'SAVINGS_NOT_PENDING' using errcode = 'P0001';
  end if;

  update public.enrollments
  set savings_return_status = 'paid',
      savings_return_paid_at = p_paid_at,
      savings_return_reference = nullif(trim(coalesce(p_reference, '')), ''),
      savings_return_paid_by = (select auth.uid())
  where id = e.id;

  insert into public.enrollment_events (enrollment_id, kind, title, body)
  values (e.id, 'savings_paid', 'Savings return paid',
          '₦' || to_char(e.savings_return_kobo / 100.0, 'FM999,999,999,990') || ' has been sent to you.');

  perform public.log_activity(
    'savings.paid', 'enrollment', e.id::text,
    'Marked savings return of ₦' || to_char(e.savings_return_kobo / 100.0, 'FM999,999,999,990') || ' as paid for ' || coalesce(e.customer_code, 'customer'),
    jsonb_build_object('reference', p_reference)
  );

  select pr.email, pr.full_name, p.name into v_email, v_name, v_pkg
  from public.profiles pr, public.packages p
  where pr.id = e.user_id and p.id = e.package_id;

  return jsonb_build_object(
    'enrollment_id', e.id, 'user_id', e.user_id, 'email', v_email, 'full_name', v_name,
    'package_name', v_pkg, 'customer_code', e.customer_code,
    'savings_return_kobo', e.savings_return_kobo, 'reference', p_reference
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Cancel an enrollment (owner decision; money already paid is untouched)
-- ---------------------------------------------------------------------------
create or replace function public.cancel_enrollment(p_enrollment_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text;
begin
  perform public.require_perm('customers.cancel');
  update public.enrollments
  set status = 'cancelled', cancelled_at = now(), cancel_reason = p_reason
  where id = p_enrollment_id and status in ('pending_payment', 'active')
  returning customer_code into v_code;
  if not found then
    raise exception 'CANNOT_CANCEL' using errcode = 'P0001';
  end if;
  insert into public.enrollment_events (enrollment_id, kind, title, body)
  values (p_enrollment_id, 'cancelled', 'Enrollment cancelled', p_reason);
  perform public.log_activity('enrollment.cancel', 'enrollment', p_enrollment_id::text,
    'Cancelled enrollment ' || coalesce(v_code, '(pending)'), jsonb_build_object('reason', p_reason));
end;
$$;

-- ---------------------------------------------------------------------------
-- Reporting
-- ---------------------------------------------------------------------------
create or replace function public.admin_overview(p_cycle_year integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not public.is_staff() and (select auth.role()) <> 'service_role' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  with cyc as (
    select e.*, p.name as package_name, p.sort_order, p.theme
    from public.enrollments e
    join public.packages p on p.id = e.package_id
    where p.cycle_year = p_cycle_year and e.status <> 'cancelled'
  ),
  inst as (
    select i.*, c.status as enrollment_status
    from public.installments i
    join cyc c on c.id = i.enrollment_id
  ),
  lines as (
    select l.*
    from public.payment_lines l
    join cyc c on c.id = l.enrollment_id
  )
  select jsonb_build_object(
    'total_customers', (select count(distinct user_id) from cyc where status <> 'pending_payment'),
    'pending_customers', (select count(*) from cyc where status = 'pending_payment'),
    'active_contributors', (select count(*) from cyc where status = 'active'),
    'completed_customers', (select count(*) from cyc where status = 'completed'),
    'late_customers', (select count(distinct enrollment_id) from inst
                       where enrollment_status = 'active' and paid_at is null
                         and due_date + public.late_grace_days() < public.lagos_today()),
    'contributions_kobo', (select coalesce(sum(amount_kobo), 0) from lines where line_type = 'contribution'),
    'registration_fees_kobo', (select coalesce(sum(amount_kobo), 0) from lines where line_type = 'registration_fee'),
    'credit_kobo', (select coalesce(sum(amount_kobo), 0) from lines where line_type = 'credit'),
    'outstanding_kobo', (select coalesce(sum(amount_kobo), 0) from inst
                         where paid_at is null and enrollment_status in ('active')),
    'overdue_kobo', (select coalesce(sum(amount_kobo), 0) from inst
                     where paid_at is null and enrollment_status = 'active'
                       and due_date + public.late_grace_days() < public.lagos_today()),
    'savings_pending_kobo', (select coalesce(sum(savings_return_kobo), 0) from cyc where savings_return_status = 'pending'),
    'needs_review', (select count(*) from public.payments pay join cyc c on c.id = pay.enrollment_id where pay.needs_review),
    'per_package', coalesce((
      select jsonb_agg(row_to_json(x) order by x.sort_order)
      from (
        select p.id, p.name, p.sort_order, p.theme, p.monthly_amount_kobo,
               count(c.id) filter (where c.status <> 'pending_payment') as customers,
               count(c.id) filter (where c.status = 'active') as active,
               count(c.id) filter (where c.status = 'completed') as completed,
               coalesce((select sum(l.amount_kobo) from lines l join cyc c2 on c2.id = l.enrollment_id
                         where c2.package_id = p.id and l.line_type = 'contribution'), 0) as collected_kobo
        from public.packages p
        left join cyc c on c.package_id = p.id
        where p.cycle_year = p_cycle_year
        group by p.id
      ) x
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- Money received per calendar month (by payment date, Lagos time)
create or replace function public.report_monthly_collections(p_year integer)
returns table (
  month date,
  contributions_kobo bigint,
  registration_fees_kobo bigint,
  credit_kobo bigint,
  total_kobo bigint,
  payments_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() and (select auth.role()) <> 'service_role' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return query
  with months as (
    select generate_series(make_date(p_year, 1, 1), make_date(p_year, 12, 1), interval '1 month')::date as m
  ),
  paid as (
    select date_trunc('month', pay.paid_at at time zone 'Africa/Lagos')::date as m, pay.id, l.line_type, l.amount_kobo
    from public.payments pay
    join public.payment_lines l on l.payment_id = pay.id
    where pay.status = 'success'
      and extract(year from pay.paid_at at time zone 'Africa/Lagos') = p_year
  )
  select months.m,
         coalesce(sum(paid.amount_kobo) filter (where paid.line_type = 'contribution'), 0)::bigint,
         coalesce(sum(paid.amount_kobo) filter (where paid.line_type = 'registration_fee'), 0)::bigint,
         coalesce(sum(paid.amount_kobo) filter (where paid.line_type = 'credit'), 0)::bigint,
         coalesce(sum(paid.amount_kobo), 0)::bigint,
         count(distinct paid.id)::bigint
  from months
  left join paid on paid.m = months.m
  group by months.m
  order by months.m;
end;
$$;

-- Rolling window of monthly collections ending at a given month
create or replace function public.report_collections_window(p_end_month date, p_months integer default 12)
returns table (
  month date,
  contributions_kobo bigint,
  registration_fees_kobo bigint,
  credit_kobo bigint,
  total_kobo bigint,
  payments_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_end date := date_trunc('month', p_end_month::timestamp)::date;
  v_start date := (date_trunc('month', p_end_month::timestamp) - make_interval(months => greatest(p_months, 1) - 1))::date;
begin
  if not public.is_staff() and (select auth.role()) <> 'service_role' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return query
  with months as (
    select generate_series(v_start, v_end, interval '1 month')::date as m
  ),
  paid as (
    select date_trunc('month', pay.paid_at at time zone 'Africa/Lagos')::date as m, pay.id, l.line_type, l.amount_kobo
    from public.payments pay
    join public.payment_lines l on l.payment_id = pay.id
    where pay.status = 'success'
      and (pay.paid_at at time zone 'Africa/Lagos')::date >= v_start
      and (pay.paid_at at time zone 'Africa/Lagos')::date < (v_end + interval '1 month')::date
  )
  select months.m,
         coalesce(sum(paid.amount_kobo) filter (where paid.line_type = 'contribution'), 0)::bigint,
         coalesce(sum(paid.amount_kobo) filter (where paid.line_type = 'registration_fee'), 0)::bigint,
         coalesce(sum(paid.amount_kobo) filter (where paid.line_type = 'credit'), 0)::bigint,
         coalesce(sum(paid.amount_kobo), 0)::bigint,
         count(distinct paid.id)::bigint
  from months
  left join paid on paid.m = months.m
  group by months.m
  order by months.m;
end;
$$;

create or replace function public.report_package_balances(p_cycle_year integer)
returns table (
  package_id uuid,
  package_name text,
  sort_order integer,
  monthly_amount_kobo bigint,
  customers bigint,
  completed bigint,
  late_customers bigint,
  expected_kobo bigint,
  collected_kobo bigint,
  outstanding_kobo bigint,
  registration_fees_kobo bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() and (select auth.role()) <> 'service_role' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return query
  with enr as (
    select e.id, e.package_id, e.status,
           e.monthly_amount_kobo * e.duration_months as expected,
           exists (
             select 1 from public.installments i
             where i.enrollment_id = e.id and i.paid_at is null
               and i.due_date + public.late_grace_days() < public.lagos_today()
           ) as is_late
    from public.enrollments e
    join public.packages p on p.id = e.package_id
    where p.cycle_year = p_cycle_year and e.status in ('active', 'completed')
  ),
  money as (
    select l.enrollment_id,
           sum(l.amount_kobo) filter (where l.line_type = 'contribution') as contributions,
           sum(l.amount_kobo) filter (where l.line_type = 'registration_fee') as fees
    from public.payment_lines l
    join enr on enr.id = l.enrollment_id
    group by l.enrollment_id
  )
  select p.id, p.name, p.sort_order, p.monthly_amount_kobo,
         count(enr.id)::bigint,
         count(enr.id) filter (where enr.status = 'completed')::bigint,
         count(enr.id) filter (where enr.status = 'active' and enr.is_late)::bigint,
         coalesce(sum(enr.expected), 0)::bigint,
         coalesce(sum(money.contributions), 0)::bigint,
         (coalesce(sum(enr.expected), 0) - coalesce(sum(money.contributions), 0))::bigint,
         coalesce(sum(money.fees), 0)::bigint
  from public.packages p
  left join enr on enr.package_id = p.id
  left join money on money.enrollment_id = enr.id
  where p.cycle_year = p_cycle_year
  group by p.id
  order by p.sort_order, p.name;
end;
$$;

-- Buying list: every food item across all qualifying customers
create or replace function public.procurement_totals(
  p_cycle_year integer,
  p_statuses public.enrollment_status[] default array['active', 'completed']::public.enrollment_status[]
)
returns table (
  item_name text,
  unit text,
  total_quantity numeric,
  customers bigint,
  breakdown jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_perm('procurement.view');
  return query
  with per_package as (
    select lower(trim(pi.name)) as item_key,
           lower(trim(pi.unit)) as unit_key,
           min(pi.name) as item_name,
           min(pi.unit) as unit,
           p.id as package_id,
           p.name as package_name,
           p.sort_order,
           count(e.id) as customers,
           max(pi.quantity) as per_customer,
           sum(pi.quantity) as quantity
    from public.enrollments e
    join public.packages p on p.id = e.package_id
    join public.package_items pi on pi.package_id = p.id
    where p.cycle_year = p_cycle_year and e.status = any (p_statuses)
    group by lower(trim(pi.name)), lower(trim(pi.unit)), p.id, p.name, p.sort_order
  )
  select min(pp.item_name),
         min(pp.unit),
         sum(pp.quantity),
         sum(pp.customers)::bigint,
         jsonb_agg(jsonb_build_object(
           'package', pp.package_name,
           'customers', pp.customers,
           'per_customer', pp.per_customer,
           'quantity', pp.quantity
         ) order by pp.sort_order)
  from per_package pp
  group by pp.item_key, pp.unit_key
  order by sum(pp.quantity) desc, min(pp.item_name);
end;
$$;

create or replace function public.referral_leaderboard(p_cycle_year integer)
returns table (
  enrollment_id uuid,
  full_name text,
  phone text,
  referral_code text,
  customer_code text,
  package_name text,
  referred_count bigint,
  active_count bigint,
  completed_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_perm('referrals.view');
  return query
  select r.id, pr.full_name, pr.phone, r.referral_code, r.customer_code, p.name,
         count(e.id) filter (where e.status <> 'cancelled'),
         count(e.id) filter (where e.status = 'active'),
         count(e.id) filter (where e.status = 'completed')
  from public.enrollments r
  join public.profiles pr on pr.id = r.user_id
  join public.packages p on p.id = r.package_id
  join public.enrollments e on e.referred_by_enrollment_id = r.id
  where p.cycle_year = p_cycle_year
  group by r.id, pr.full_name, pr.phone, p.name
  having count(e.id) filter (where e.status <> 'cancelled') > 0
  order by count(e.id) filter (where e.status in ('active', 'completed')) desc,
           count(e.id) filter (where e.status <> 'cancelled') desc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Reminder candidates for the daily email job
-- ---------------------------------------------------------------------------
create or replace function public.reminder_candidates()
returns table (
  kind text,
  installment_id uuid,
  enrollment_id uuid,
  user_id uuid,
  email text,
  full_name text,
  customer_code text,
  package_name text,
  period_month date,
  due_date date,
  amount_kobo bigint,
  paid_count bigint,
  duration_months smallint
)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (select * from public.app_settings where id = 1)
  select
    case when i.due_date >= public.lagos_today() then 'reminder' else 'overdue' end,
    i.id, e.id, e.user_id, pr.email, pr.full_name, e.customer_code, p.name,
    i.period_month, i.due_date, i.amount_kobo,
    (select count(*) from public.installments x where x.enrollment_id = e.id and x.paid_at is not null),
    e.duration_months
  from public.installments i
  join public.enrollments e on e.id = i.enrollment_id
  join public.profiles pr on pr.id = e.user_id
  join public.packages p on p.id = e.package_id
  cross join s
  where e.status = 'active'
    and i.paid_at is null
    and (
      -- upcoming reminder: within the reminder window before the due date
      (i.due_date >= public.lagos_today() and i.due_date <= public.lagos_today() + s.reminder_days_before)
      or
      -- overdue notice: the day the grace period runs out
      (s.send_overdue_notices and i.due_date + s.late_grace_days = public.lagos_today())
    )
    -- only the earliest unpaid month per customer
    and i.month_index = (
      select min(x.month_index) from public.installments x
      where x.enrollment_id = e.id and x.paid_at is null
    );
$$;
