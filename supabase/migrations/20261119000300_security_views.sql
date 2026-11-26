-- ============================================================================
-- Luxuriate Foodstuff — row level security, views, grants, realtime
-- Permissions used by staff accounts (owners implicitly hold all of them):
--   customers.view  customers.edit  customers.cancel
--   payments.view   payments.record
--   packages.manage procurement.view fulfilment.manage savings.manage
--   referrals.view  emails.manage    reports.view      settings.manage
--   staff.manage    activity.view
-- ============================================================================

alter table public.profiles          enable row level security;
alter table public.collection_points enable row level security;
alter table public.packages          enable row level security;
alter table public.package_items     enable row level security;
alter table public.enrollments       enable row level security;
alter table public.payments          enable row level security;
alter table public.installments      enable row level security;
alter table public.payment_lines     enable row level security;
alter table public.enrollment_events enable row level security;
alter table public.email_templates   enable row level security;
alter table public.email_log         enable row level security;
alter table public.activity_log      enable row level security;
alter table public.app_settings      enable row level security;
alter table public.code_counters     enable row level security;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
-- Any active staff member can read customer names and contacts; what they can
-- change is limited by their individual permissions.
create policy "profiles: read own or staff"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_staff());

create policy "profiles: update own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "profiles: staff update customers"
  on public.profiles for update to authenticated
  using (public.has_perm('customers.edit') and role = 'customer')
  with check (public.has_perm('customers.edit') and role = 'customer');

-- Only contact details are writable through the API. Role, permissions,
-- email and account numbers can only change through trusted server code.
revoke update on public.profiles from anon, authenticated;
grant update (full_name, phone, whatsapp, address, state, lga, emergency_contact_name, emergency_contact_phone)
  on public.profiles to authenticated;
revoke insert, delete on public.profiles from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Catalogue: packages, items, collection points (public read)
-- ---------------------------------------------------------------------------
create policy "packages: public read" on public.packages for select to anon, authenticated using (true);
create policy "packages: manage" on public.packages for all to authenticated
  using (public.has_perm('packages.manage')) with check (public.has_perm('packages.manage'));

create policy "package_items: public read" on public.package_items for select to anon, authenticated using (true);
create policy "package_items: manage" on public.package_items for all to authenticated
  using (public.has_perm('packages.manage')) with check (public.has_perm('packages.manage'));

create policy "collection_points: public read" on public.collection_points for select to anon, authenticated using (true);
create policy "collection_points: manage" on public.collection_points for all to authenticated
  using (public.has_perm('settings.manage')) with check (public.has_perm('settings.manage'));

-- ---------------------------------------------------------------------------
-- Enrollments & schedule
-- ---------------------------------------------------------------------------
create policy "enrollments: read own or staff"
  on public.enrollments for select to authenticated
  using (user_id = (select auth.uid()) or public.is_staff());

create policy "enrollments: staff edit"
  on public.enrollments for update to authenticated
  using (public.has_perm('customers.edit'))
  with check (public.has_perm('customers.edit'));

-- Staff may only change the collection point directly; everything else goes
-- through the security-definer functions above.
revoke insert, update, delete on public.enrollments from anon, authenticated;
grant update (collection_point_id) on public.enrollments to authenticated;

create policy "installments: read own or staff"
  on public.installments for select to authenticated
  using (
    exists (select 1 from public.enrollments e where e.id = enrollment_id and e.user_id = (select auth.uid()))
    or public.is_staff()
  );
revoke insert, update, delete on public.installments from anon, authenticated;

create policy "enrollment_events: read own or staff"
  on public.enrollment_events for select to authenticated
  using (
    exists (select 1 from public.enrollments e where e.id = enrollment_id and e.user_id = (select auth.uid()))
    or public.is_staff()
  );
revoke insert, update, delete on public.enrollment_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Payments (written only by the server after Paystack confirms)
-- ---------------------------------------------------------------------------
create policy "payments: read own or staff"
  on public.payments for select to authenticated
  using (user_id = (select auth.uid()) or public.has_perm('payments.view') or public.has_perm('customers.view'));
revoke insert, update, delete on public.payments from anon, authenticated;

create policy "payment_lines: read own or staff"
  on public.payment_lines for select to authenticated
  using (
    exists (select 1 from public.enrollments e where e.id = enrollment_id and e.user_id = (select auth.uid()))
    or public.has_perm('payments.view')
    or public.has_perm('customers.view')
  );
revoke insert, update, delete on public.payment_lines from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Email
-- ---------------------------------------------------------------------------
create policy "email_templates: manage" on public.email_templates for all to authenticated
  using (public.has_perm('emails.manage')) with check (public.has_perm('emails.manage'));
revoke insert, delete on public.email_templates from anon, authenticated;

create policy "email_log: read" on public.email_log for select to authenticated
  using (public.has_perm('emails.manage'));
revoke insert, update, delete on public.email_log from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Activity log (insert only through log_activity)
-- ---------------------------------------------------------------------------
create policy "activity_log: read" on public.activity_log for select to authenticated
  using (public.has_perm('activity.view'));
revoke insert, update, delete on public.activity_log from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Settings (public read for support contacts and terms)
-- ---------------------------------------------------------------------------
create policy "app_settings: public read" on public.app_settings for select to anon, authenticated using (true);
create policy "app_settings: manage" on public.app_settings for update to authenticated
  using (public.has_perm('settings.manage')) with check (public.has_perm('settings.manage'));
revoke insert, delete on public.app_settings from anon, authenticated;

-- code_counters: no policies → no API access at all
revoke all on public.code_counters from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Views (security_invoker so the policies above still apply)
-- ---------------------------------------------------------------------------
create view public.enrollment_overview
with (security_invoker = true) as
select
  e.id,
  e.user_id,
  e.package_id,
  e.collection_point_id,
  e.customer_code,
  e.referral_code,
  e.referred_by_enrollment_id,
  e.status,
  e.monthly_amount_kobo,
  e.registration_fee_kobo,
  e.savings_return_kobo,
  e.duration_months,
  e.credit_kobo,
  e.registration_paid_at,
  e.fulfilment_status,
  e.collection_scheduled_for,
  e.fulfilment_note,
  e.fulfilment_updated_at,
  e.savings_return_status,
  e.savings_return_paid_at,
  e.savings_return_reference,
  e.activated_at,
  e.completed_at,
  e.cancelled_at,
  e.created_at,
  p.name as package_name,
  p.slug as package_slug,
  p.cycle_year,
  p.theme as package_theme,
  p.start_month as package_start_month,
  pr.full_name,
  pr.email,
  pr.phone,
  pr.whatsapp,
  pr.address,
  pr.state,
  pr.lga,
  cp.name as collection_point_name,
  cp.address as collection_point_address,
  coalesce(s.paid_count, 0)::integer as paid_count,
  coalesce(s.paid_kobo, 0)::bigint as paid_kobo,
  (e.monthly_amount_kobo * e.duration_months)::bigint as total_kobo,
  (e.monthly_amount_kobo * e.duration_months - coalesce(s.paid_kobo, 0))::bigint as outstanding_kobo,
  s.next_due_date,
  coalesce(s.late_count, 0)::integer as late_count,
  s.last_paid_at,
  ref.referral_code as referred_by_code
from public.enrollments e
join public.packages p on p.id = e.package_id
join public.profiles pr on pr.id = e.user_id
left join public.collection_points cp on cp.id = e.collection_point_id
left join public.enrollments ref on ref.id = e.referred_by_enrollment_id
left join lateral (
  select
    count(*) filter (where i.paid_at is not null) as paid_count,
    sum(i.amount_kobo) filter (where i.paid_at is not null) as paid_kobo,
    min(i.due_date) filter (where i.paid_at is null) as next_due_date,
    count(*) filter (where i.paid_at is null and i.due_date + public.late_grace_days() < public.lagos_today()) as late_count,
    max(i.paid_at) as last_paid_at
  from public.installments i
  where i.enrollment_id = e.id
) s on true;

create view public.installment_overview
with (security_invoker = true) as
select
  i.id,
  i.enrollment_id,
  i.month_index,
  i.period_month,
  i.due_date,
  i.amount_kobo,
  i.paid_at,
  i.payment_id,
  public.installment_state(i.paid_at, i.due_date, e.status) as state,
  e.status as enrollment_status,
  e.user_id,
  e.customer_code,
  e.package_id,
  p.name as package_name,
  p.cycle_year,
  pr.full_name,
  pr.phone,
  pr.email
from public.installments i
join public.enrollments e on e.id = i.enrollment_id
join public.packages p on p.id = e.package_id
join public.profiles pr on pr.id = e.user_id;

create view public.payment_overview
with (security_invoker = true) as
select
  pay.*,
  e.customer_code,
  e.package_id,
  p.name as package_name,
  p.cycle_year,
  pr.full_name,
  pr.phone,
  pr.email,
  coalesce((select sum(l.amount_kobo) from public.payment_lines l where l.payment_id = pay.id and l.line_type = 'registration_fee'), 0)::bigint as registration_kobo,
  coalesce((select sum(l.amount_kobo) from public.payment_lines l where l.payment_id = pay.id and l.line_type = 'contribution'), 0)::bigint as contribution_kobo,
  coalesce((select count(*) from public.payment_lines l where l.payment_id = pay.id and l.line_type = 'contribution'), 0)::integer as months_covered,
  (select string_agg(to_char(i.period_month, 'Mon YYYY'), ', ' order by i.month_index)
     from public.payment_lines l join public.installments i on i.id = l.installment_id
     where l.payment_id = pay.id) as months_label
from public.payments pay
join public.enrollments e on e.id = pay.enrollment_id
join public.packages p on p.id = e.package_id
join public.profiles pr on pr.id = pay.user_id;

-- ---------------------------------------------------------------------------
-- Grants. Tables are reachable through the Data API only as the policies
-- above allow; functions that move money are callable by the server only.
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to authenticated;
grant select on public.packages, public.package_items, public.collection_points, public.app_settings to anon;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant insert, update, delete on public.packages, public.package_items, public.collection_points to authenticated;
grant update on public.email_templates, public.app_settings to authenticated;
revoke all on public.code_counters from anon, authenticated;

-- server-only (service_role) functions
revoke execute on function public.next_counter(text) from public, anon, authenticated;
revoke execute on function public.generate_referral_code(text, integer) from public, anon, authenticated;
revoke execute on function public.create_enrollment(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.prepare_payment(uuid, uuid, integer, public.payment_provider) from public, anon, authenticated;
revoke execute on function public.finalize_payment(text, bigint, timestamptz, text, bigint, bigint, text, jsonb) from public, anon, authenticated;
revoke execute on function public.mark_payment_unsuccessful(text, public.payment_status, text, jsonb) from public, anon, authenticated;
revoke execute on function public.record_external_payment(uuid, text, bigint, public.payment_provider, timestamptz, text, bigint, bigint, jsonb) from public, anon, authenticated;
revoke execute on function public.reminder_candidates() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;

grant execute on function public.next_counter(text) to service_role;
grant execute on function public.generate_referral_code(text, integer) to service_role;
grant execute on function public.create_enrollment(uuid, uuid, uuid, text) to service_role;
grant execute on function public.prepare_payment(uuid, uuid, integer, public.payment_provider) to service_role;
grant execute on function public.finalize_payment(text, bigint, timestamptz, text, bigint, bigint, text, jsonb) to service_role;
grant execute on function public.mark_payment_unsuccessful(text, public.payment_status, text, jsonb) to service_role;
grant execute on function public.record_external_payment(uuid, text, bigint, public.payment_provider, timestamptz, text, bigint, bigint, jsonb) to service_role;
grant execute on function public.reminder_candidates() to service_role;

-- staff functions (each checks its own permission inside)
revoke execute on function public.record_manual_payment(uuid, integer, text, timestamptz) from public, anon;
revoke execute on function public.set_fulfilment_status(uuid[], public.fulfilment_status, timestamptz, text) from public, anon;
revoke execute on function public.mark_savings_return_paid(uuid, text, timestamptz) from public, anon;
revoke execute on function public.cancel_enrollment(uuid, text) from public, anon;
revoke execute on function public.admin_overview(integer) from public, anon;
revoke execute on function public.report_monthly_collections(integer) from public, anon;
revoke execute on function public.report_package_balances(integer) from public, anon;
revoke execute on function public.report_collections_window(date, integer) from public, anon;
revoke execute on function public.procurement_totals(integer, public.enrollment_status[]) from public, anon;
revoke execute on function public.referral_leaderboard(integer) from public, anon;
revoke execute on function public.log_activity(text, text, text, text, jsonb) from public, anon;
revoke execute on function public.my_referrals() from public, anon;

grant execute on function public.record_manual_payment(uuid, integer, text, timestamptz) to authenticated, service_role;
grant execute on function public.set_fulfilment_status(uuid[], public.fulfilment_status, timestamptz, text) to authenticated, service_role;
grant execute on function public.mark_savings_return_paid(uuid, text, timestamptz) to authenticated, service_role;
grant execute on function public.cancel_enrollment(uuid, text) to authenticated, service_role;
grant execute on function public.admin_overview(integer) to authenticated, service_role;
grant execute on function public.report_monthly_collections(integer) to authenticated, service_role;
grant execute on function public.report_package_balances(integer) to authenticated, service_role;
grant execute on function public.report_collections_window(date, integer) to authenticated, service_role;
grant execute on function public.procurement_totals(integer, public.enrollment_status[]) to authenticated, service_role;
grant execute on function public.referral_leaderboard(integer) to authenticated, service_role;
grant execute on function public.log_activity(text, text, text, text, jsonb) to authenticated, service_role;
grant execute on function public.my_referrals() to authenticated;

-- public lookup used by the registration form
grant execute on function public.validate_referral_code(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: the admin dashboard updates itself as payments land
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.payments;
    alter publication supabase_realtime add table public.enrollments;
  end if;
end;
$$;
