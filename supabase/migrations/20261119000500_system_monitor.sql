-- ============================================================================
-- Luxuriate Foodstuff — system monitor
-- A log of background runs (the daily reminder job, Paystack webhooks) and one
-- function that gathers every figure the back-office overview needs in a
-- single round trip. Each section is returned only to staff who hold the
-- matching permission; owners see everything.
-- ============================================================================

create table public.system_events (
  id           bigint generated always as identity primary key,
  source       text not null,                 -- cron.reminders, paystack.webhook …
  status       text not null check (status in ('ok', 'error', 'skipped')),
  summary      text not null default '',
  details      jsonb,
  duration_ms  integer,
  created_at   timestamptz not null default now()
);

create index system_events_source_idx on public.system_events (source, created_at desc);
create index system_events_created_idx on public.system_events (created_at desc);
create index email_log_status_created_idx on public.email_log (status, created_at desc);
create index payments_created_idx on public.payments (created_at desc);

alter table public.system_events enable row level security;

create policy "system_events: read" on public.system_events for select to authenticated
  using (public.has_perm('settings.manage'));

-- written only by trusted server code (service role)
revoke all on public.system_events from anon;
revoke insert, update, delete on public.system_events from authenticated;
grant select on public.system_events to authenticated;
grant all on public.system_events to service_role;
grant usage, select on sequence public.system_events_id_seq to service_role;

-- ---------------------------------------------------------------------------
-- system_monitor: the whole business on one page
-- ---------------------------------------------------------------------------
create or replace function public.system_monitor(p_cycle_year integer)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_server  boolean := (select auth.role()) = 'service_role';
  v_today   date := public.lagos_today();
  v_month   date := date_trunc('month', public.lagos_today()::timestamp)::date;
  v_grace   integer := public.late_grace_days();
  v_out     jsonb;
  v_section jsonb;
begin
  if not v_server and not public.is_staff() then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  v_out := jsonb_build_object('today', v_today, 'generated_at', now(), 'cycle_year', p_cycle_year);

  -- ── Money ────────────────────────────────────────────────────────────────
  if v_server or public.has_perm('payments.view') then
    with paid as (
      select pay.id, pay.amount_kobo, coalesce(pay.fees_kobo, 0) as fees_kobo, pay.provider, pay.channel,
             (pay.paid_at at time zone 'Africa/Lagos')::date as d
      from public.payments pay
      where pay.status = 'success' and pay.paid_at is not null
    ),
    recent_lines as (
      select (pay.paid_at at time zone 'Africa/Lagos')::date as d, pay.id as payment_id, l.line_type, l.amount_kobo
      from public.payments pay
      join public.payment_lines l on l.payment_id = pay.id
      where pay.status = 'success' and pay.paid_at >= (v_today - 95)::timestamp
    ),
    days as (
      select generate_series(v_today - 89, v_today, interval '1 day')::date as d
    ),
    per_day as (
      select d,
             sum(amount_kobo) filter (where line_type <> 'registration_fee') as c,
             sum(amount_kobo) filter (where line_type = 'registration_fee') as f,
             count(distinct payment_id) as n
      from recent_lines
      group by d
    ),
    attempts as (
      select status, created_at from public.payments where created_at >= now() - interval '30 days'
    ),
    months as (
      select generate_series(v_month, (v_month + interval '5 months')::date, interval '1 month')::date as m
    ),
    sched as (
      select date_trunc('month', i.due_date::timestamp)::date as m, i.amount_kobo, i.paid_at, i.enrollment_id
      from public.installments i
      join public.enrollments e on e.id = i.enrollment_id
      where e.status in ('active', 'completed')
        and i.due_date >= v_month and i.due_date < (v_month + interval '6 months')::date
    ),
    next_due as (
      select i.due_date, sum(i.amount_kobo) as kobo, count(distinct i.enrollment_id) as customers
      from public.installments i
      join public.enrollments e on e.id = i.enrollment_id
      where e.status = 'active' and i.paid_at is null and i.due_date >= v_today
      group by i.due_date
      order by i.due_date
      limit 1
    ),
    overdue as (
      select i.amount_kobo, i.enrollment_id
      from public.installments i
      join public.enrollments e on e.id = i.enrollment_id
      where e.status = 'active' and i.paid_at is null and i.due_date + v_grace < v_today
    )
    select jsonb_build_object(
      'all_time_kobo',   (select coalesce(sum(amount_kobo), 0) from paid),
      'payments_count',  (select count(*) from paid),
      'fees_kobo',       (select coalesce(sum(fees_kobo), 0) from paid),
      'today_kobo',      (select coalesce(sum(amount_kobo), 0) from paid where d = v_today),
      'today_count',     (select count(*) from paid where d = v_today),
      'week_kobo',       (select coalesce(sum(amount_kobo), 0) from paid where d > v_today - 7),
      'mtd_kobo',        (select coalesce(sum(amount_kobo), 0) from paid where d >= v_month),
      'prev_mtd_kobo',   (select coalesce(sum(amount_kobo), 0) from paid
                          where d >= (v_month - interval '1 month')::date
                            and d <= (v_today - interval '1 month')::date),
      'last_payment_at', (select max(pay.paid_at) from public.payments pay where pay.status = 'success'),
      'daily', (
        select jsonb_agg(jsonb_build_object('d', days.d, 'c', coalesce(per_day.c, 0), 'f', coalesce(per_day.f, 0), 'n', coalesce(per_day.n, 0)) order by days.d)
        from days left join per_day on per_day.d = days.d
      ),
      'attempts', (
        select jsonb_build_object(
          'success',   count(*) filter (where status = 'success'),
          'failed',    count(*) filter (where status = 'failed'),
          'abandoned', count(*) filter (where status = 'abandoned'
                                          or (status = 'pending' and created_at < now() - interval '1 hour')),
          'open',      count(*) filter (where status = 'pending' and created_at >= now() - interval '1 hour'))
        from attempts
      ),
      'channels', coalesce((
        select jsonb_agg(jsonb_build_object('channel', ch, 'n', n, 'kobo', kobo) order by kobo desc)
        from (
          select case
                   when provider = 'manual' then 'offline'
                   when provider = 'test' then 'test'
                   when provider = 'paystack_dva' then 'dedicated_nuban'
                   else coalesce(nullif(channel, ''), 'other')
                 end as ch,
                 count(*) as n, sum(amount_kobo) as kobo
          from paid
          where d > v_today - 90
          group by 1
        ) s
      ), '[]'::jsonb),
      'forecast', (
        select jsonb_agg(jsonb_build_object(
                 'm', months.m,
                 'due_kobo', coalesce((select sum(amount_kobo) from sched where sched.m = months.m), 0),
                 'paid_kobo', coalesce((select sum(amount_kobo) from sched where sched.m = months.m and paid_at is not null), 0),
                 'customers', coalesce((select count(distinct enrollment_id) from sched where sched.m = months.m), 0))
               order by months.m)
        from months
      ),
      'next_due', (select jsonb_build_object('date', due_date, 'kobo', kobo, 'customers', customers) from next_due),
      'overdue_kobo',      (select coalesce(sum(amount_kobo), 0) from overdue),
      'overdue_customers', (select count(distinct enrollment_id) from overdue),
      'credit_held_kobo',  (select coalesce(sum(credit_kobo), 0) from public.enrollments where status <> 'cancelled'),
      'needs_review',      (select count(*) from public.payments where needs_review)
    ) into v_section;
    v_out := v_out || jsonb_build_object('money', v_section);
  end if;

  -- ── Customers ────────────────────────────────────────────────────────────
  if v_server or public.has_perm('customers.view') then
    with cyc as (
      select e.*
      from public.enrollments e
      join public.packages p on p.id = e.package_id
      where p.cycle_year = p_cycle_year
    ),
    late as (
      select distinct i.enrollment_id
      from public.installments i
      join cyc on cyc.id = i.enrollment_id
      where cyc.status = 'active' and i.paid_at is null and i.due_date + v_grace < v_today
    ),
    days as (
      select generate_series(v_today - 29, v_today, interval '1 day')::date as d
    ),
    joined as (
      select (created_at at time zone 'Africa/Lagos')::date as d from public.enrollments
      where created_at >= (v_today - 30)::timestamp
    ),
    activated as (
      select (activated_at at time zone 'Africa/Lagos')::date as d from public.enrollments
      where activated_at >= (v_today - 30)::timestamp
    )
    select jsonb_build_object(
      'registered', (select count(*) from cyc),
      'pending',    (select count(*) from cyc where status = 'pending_payment'),
      'stalled',    (select count(*) from cyc where status = 'pending_payment' and created_at < now() - interval '3 days'),
      'active',     (select count(*) from cyc where status = 'active'),
      'completed',  (select count(*) from cyc where status = 'completed'),
      'cancelled',  (select count(*) from cyc where status = 'cancelled'),
      'late',       (select count(*) from late),
      'accounts',   (select count(*) from public.profiles where role = 'customer'),
      'new_7d',       (select count(*) from public.enrollments where created_at >= now() - interval '7 days'),
      'activated_7d', (select count(*) from public.enrollments where activated_at >= now() - interval '7 days'),
      'daily', (
        select jsonb_agg(jsonb_build_object(
                 'd', days.d,
                 'joined', (select count(*) from joined where joined.d = days.d),
                 'activated', (select count(*) from activated where activated.d = days.d))
               order by days.d)
        from days
      ),
      'by_state', coalesce((
        select jsonb_agg(jsonb_build_object('state', state, 'n', n) order by n desc, state)
        from (
          select coalesce(nullif(trim(pr.state), ''), 'Not given') as state, count(distinct pr.id) as n
          from cyc
          join public.profiles pr on pr.id = cyc.user_id
          where cyc.status in ('active', 'completed')
          group by 1
          order by 2 desc, 1
          limit 8
        ) s
      ), '[]'::jsonb)
    ) into v_section;
    v_out := v_out || jsonb_build_object('customers', v_section);
  end if;

  -- ── Operations: fulfilment and savings returns ───────────────────────────
  if v_server or public.has_perm('fulfilment.manage') or public.has_perm('savings.manage') or public.has_perm('customers.view') then
    with cyc as (
      select e.*
      from public.enrollments e
      join public.packages p on p.id = e.package_id
      where p.cycle_year = p_cycle_year and e.status in ('active', 'completed')
    )
    select jsonb_build_object(
      'fulfilment', (
        select jsonb_build_object(
          'not_started',          count(*) filter (where fulfilment_status = 'not_started'),
          'preparing',            count(*) filter (where fulfilment_status = 'preparing'),
          'ready',                count(*) filter (where fulfilment_status = 'ready'),
          'collection_scheduled', count(*) filter (where fulfilment_status = 'collection_scheduled'),
          'collected',            count(*) filter (where fulfilment_status = 'collected'),
          'completed_waiting',    count(*) filter (where status = 'completed' and fulfilment_status = 'not_started'),
          'scheduled_7d',         count(*) filter (where fulfilment_status = 'collection_scheduled'
                                                     and collection_scheduled_for >= now()
                                                     and collection_scheduled_for < now() + interval '7 days'))
        from cyc
      ),
      'savings', (
        select jsonb_build_object(
          'pending',      count(*) filter (where savings_return_status = 'pending'),
          'pending_kobo', coalesce(sum(savings_return_kobo) filter (where savings_return_status = 'pending'), 0),
          'paid',         count(*) filter (where savings_return_status = 'paid'),
          'paid_kobo',    coalesce(sum(savings_return_kobo) filter (where savings_return_status = 'paid'), 0))
        from cyc
      ),
      'collection_points', (select count(*) from public.collection_points where is_active)
    ) into v_section;
    v_out := v_out || jsonb_build_object('operations', v_section);
  end if;

  -- ── Emails ───────────────────────────────────────────────────────────────
  if v_server or public.has_perm('emails.manage') then
    with recent as (
      select * from public.email_log where created_at >= now() - interval '30 days'
    ),
    days as (
      select generate_series(v_today - 13, v_today, interval '1 day')::date as d
    ),
    per_day as (
      select (created_at at time zone 'Africa/Lagos')::date as d,
             count(*) filter (where status = 'sent') as sent,
             count(*) filter (where status = 'failed') as failed,
             count(*) filter (where status = 'skipped') as skipped
      from recent
      group by 1
    )
    select jsonb_build_object(
      'sent_30d',    (select count(*) from recent where status = 'sent'),
      'failed_30d',  (select count(*) from recent where status = 'failed'),
      'skipped_30d', (select count(*) from recent where status = 'skipped'),
      'failed_24h',  (select count(*) from recent where status = 'failed' and created_at >= now() - interval '24 hours'),
      'last_sent_at', (select max(created_at) from public.email_log where status = 'sent'),
      'provider',    (select provider from public.email_log order by created_at desc limit 1),
      'daily', (
        select jsonb_agg(jsonb_build_object('d', days.d, 'sent', coalesce(sent, 0), 'failed', coalesce(failed, 0), 'skipped', coalesce(skipped, 0)) order by days.d)
        from days left join per_day on per_day.d = days.d
      ),
      'by_template', coalesce((
        select jsonb_agg(jsonb_build_object('key', k, 'name', name, 'sent', sent, 'failed', failed) order by sent + failed desc)
        from (
          select coalesce(r.template_key, 'custom') as k,
                 coalesce(t.name, initcap(replace(coalesce(r.template_key, 'custom'), '_', ' '))) as name,
                 count(*) filter (where r.status = 'sent') as sent,
                 count(*) filter (where r.status = 'failed') as failed
          from recent r
          left join public.email_templates t on t.key = r.template_key
          group by 1, 2
          order by count(*) desc
          limit 8
        ) s
      ), '[]'::jsonb),
      'failures', coalesce((
        select jsonb_agg(jsonb_build_object('to', to_email, 'subject', subject, 'error', error, 'at', created_at, 'template', template_key) order by created_at desc)
        from (select * from public.email_log where status = 'failed' order by created_at desc limit 5) f
      ), '[]'::jsonb),
      'templates', (select jsonb_build_object('enabled', count(*) filter (where is_enabled), 'total', count(*)) from public.email_templates)
    ) into v_section;
    v_out := v_out || jsonb_build_object('emails', v_section);
  end if;

  -- ── Team ─────────────────────────────────────────────────────────────────
  if v_server or public.has_perm('staff.manage') then
    select jsonb_build_object(
      'members', coalesce(jsonb_agg(m order by m.role_rank, m.last_action_at desc nulls last, m.full_name), '[]'::jsonb)
    )
    into v_section
    from (
      select pr.id, pr.full_name, pr.email, pr.role, pr.is_active,
             cardinality(pr.permissions) as permissions,
             case pr.role when 'owner' then 0 else 1 end as role_rank,
             u.last_sign_in_at,
             (select max(a.created_at) from public.activity_log a where a.actor_id = pr.id) as last_action_at,
             (select count(*) from public.activity_log a where a.actor_id = pr.id and a.created_at >= now() - interval '7 days') as actions_7d
      from public.profiles pr
      left join auth.users u on u.id = pr.id
      where pr.role in ('owner', 'staff')
    ) m;
    v_out := v_out || jsonb_build_object('team', v_section);
  end if;

  -- ── System ───────────────────────────────────────────────────────────────
  if v_server or public.has_perm('settings.manage') then
    select jsonb_build_object(
      'db_bytes', pg_database_size(current_database()),
      'rows', jsonb_build_object(
        'profiles',      (select count(*) from public.profiles),
        'enrollments',   (select count(*) from public.enrollments),
        'payments',      (select count(*) from public.payments),
        'installments',  (select count(*) from public.installments),
        'email_log',     (select count(*) from public.email_log),
        'activity_log',  (select count(*) from public.activity_log),
        'system_events', (select count(*) from public.system_events)
      ),
      'rls', (
        select jsonb_build_object(
          'total', count(*),
          'protected', count(*) filter (where c.relrowsecurity),
          'unprotected', coalesce(jsonb_agg(c.relname order by c.relname) filter (where not c.relrowsecurity), '[]'::jsonb))
        from pg_catalog.pg_class c
        where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
      ),
      'auth', (
        select jsonb_build_object(
          'users', count(*),
          'signins_24h', count(*) filter (where u.last_sign_in_at >= now() - interval '24 hours'),
          'unconfirmed', count(*) filter (where u.email_confirmed_at is null))
        from auth.users u
      ),
      'jobs', coalesce((
        select jsonb_agg(j order by j.source)
        from (
          select distinct on (source) source, status, summary, created_at, duration_ms
          from public.system_events
          order by source, created_at desc
        ) j
      ), '[]'::jsonb),
      'webhooks_24h', (
        select jsonb_build_object('ok', count(*) filter (where status = 'ok'), 'error', count(*) filter (where status = 'error'))
        from public.system_events
        where source = 'paystack.webhook' and created_at >= now() - interval '24 hours'
      ),
      'errors_24h', (select count(*) from public.system_events where status = 'error' and created_at >= now() - interval '24 hours'),
      'settings', (
        select jsonb_build_object(
          'reminder_days_before', reminder_days_before,
          'late_grace_days', late_grace_days,
          'send_overdue_notices', send_overdue_notices,
          'terms_set', length(trim(terms_content)) > 0,
          'support_set', coalesce(support_email, support_phone, whatsapp_number) is not null)
        from public.app_settings where id = 1
      )
    ) into v_section;
    v_out := v_out || jsonb_build_object('system', v_section);
  end if;

  -- ── One stream of everything that happened, newest first ─────────────────
  select coalesce(jsonb_agg(s order by s.at desc), '[]'::jsonb)
  into v_section
  from (
    select * from (
      select 'payment' as kind, pay.paid_at as at, pr.full_name as title,
             p.name || coalesce(' · ' || nullif(pay.channel, ''), '') as detail,
             pay.amount_kobo as kobo, pay.enrollment_id::text as ref
      from public.payments pay
      join public.profiles pr on pr.id = pay.user_id
      join public.enrollments e on e.id = pay.enrollment_id
      join public.packages p on p.id = e.package_id
      where (v_server or public.has_perm('payments.view')) and pay.status = 'success'
      order by pay.paid_at desc limit 8
    ) a
    union all
    select * from (
      select 'payment_failed', pay.updated_at, pr.full_name,
             coalesce(nullif(pay.gateway_response, ''), initcap(pay.status::text)), pay.amount_kobo, pay.enrollment_id::text
      from public.payments pay
      join public.profiles pr on pr.id = pay.user_id
      where (v_server or public.has_perm('payments.view')) and pay.status in ('failed', 'abandoned')
      order by pay.updated_at desc limit 4
    ) b
    union all
    select * from (
      select 'signup', e.created_at, pr.full_name, 'Registered for ' || p.name, null::bigint, e.id::text
      from public.enrollments e
      join public.profiles pr on pr.id = e.user_id
      join public.packages p on p.id = e.package_id
      where (v_server or public.has_perm('customers.view'))
      order by e.created_at desc limit 6
    ) c
    union all
    select * from (
      select 'completed', e.completed_at, pr.full_name, 'Finished ' || p.name, null::bigint, e.id::text
      from public.enrollments e
      join public.profiles pr on pr.id = e.user_id
      join public.packages p on p.id = e.package_id
      where (v_server or public.has_perm('customers.view')) and e.completed_at is not null
      order by e.completed_at desc limit 4
    ) d
    union all
    select * from (
      select 'email_failed', l.created_at, l.to_email, coalesce(l.error, l.subject), null::bigint, l.id::text
      from public.email_log l
      where (v_server or public.has_perm('emails.manage')) and l.status = 'failed'
      order by l.created_at desc limit 4
    ) f
    union all
    select * from (
      select 'staff', a.created_at, coalesce(a.actor_name, 'System'), a.summary, null::bigint, a.action
      from public.activity_log a
      where (v_server or public.has_perm('activity.view'))
      order by a.created_at desc limit 8
    ) g
    union all
    select * from (
      select case when ev.status = 'error' then 'system_error' else 'system' end, ev.created_at, ev.source, ev.summary, null::bigint, ev.id::text
      from public.system_events ev
      where (v_server or public.has_perm('settings.manage'))
        and (ev.status = 'error' or ev.source <> 'paystack.webhook')
      order by ev.created_at desc limit 6
    ) h
    order by 2 desc
    limit 16
  ) s;
  v_out := v_out || jsonb_build_object('stream', v_section);

  return v_out;
end;
$$;

revoke execute on function public.system_monitor(integer) from public, anon;
grant execute on function public.system_monitor(integer) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Realtime: the overview also refreshes when emails, staff actions or
-- background runs are logged
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['email_log', 'activity_log', 'system_events'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end;
$$;
