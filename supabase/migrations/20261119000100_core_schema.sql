-- ============================================================================
-- Luxuriate Foodstuff — core schema
-- All money is stored in kobo (bigint). ₦1 = 100 kobo. Paystack also uses kobo.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('customer', 'staff', 'owner');

create type public.enrollment_status as enum (
  'pending_payment', -- registered, registration fee not yet confirmed
  'active',          -- contributing
  'completed',       -- every month paid
  'cancelled'
);

create type public.fulfilment_status as enum (
  'not_started',
  'preparing',
  'ready',
  'collection_scheduled',
  'collected'
);

create type public.savings_return_status as enum ('not_applicable', 'pending', 'paid');

create type public.payment_status as enum ('pending', 'success', 'failed', 'abandoned');

-- registration_fee and contribution lines keep the books clean.
-- credit lines hold money that could not be matched to a whole month
-- (positive = held, negative = applied from an earlier credit).
create type public.payment_line_type as enum ('registration_fee', 'contribution', 'credit');

create type public.payment_provider as enum ('paystack', 'paystack_dva', 'manual', 'test');

-- ---------------------------------------------------------------------------
-- Shared trigger: keep updated_at fresh
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles (one per auth user)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                       uuid primary key references auth.users (id) on delete cascade,
  full_name                text not null default '',
  email                    text not null default '',
  phone                    text,
  whatsapp                 text,
  address                  text,
  state                    text,
  lga                      text,
  emergency_contact_name   text,
  emergency_contact_phone  text,
  role                     public.app_role not null default 'customer',
  permissions              text[] not null default '{}',
  is_active                boolean not null default true,
  -- Optional Paystack dedicated virtual account (personal account number)
  paystack_customer_code   text unique,
  dva_account_number       text,
  dva_account_name         text,
  dva_bank_name            text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);
create index profiles_phone_idx on public.profiles (phone);
create index profiles_email_lower_idx on public.profiles (lower(email));

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Collection points
-- ---------------------------------------------------------------------------
create table public.collection_points (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  address     text not null,
  state       text,
  phone       text,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger collection_points_updated_at before update on public.collection_points
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Packages (one row per package per cycle year) and their food items
-- ---------------------------------------------------------------------------
create table public.packages (
  id                     uuid primary key default gen_random_uuid(),
  cycle_year             integer not null check (cycle_year between 2020 and 2100),
  slug                   text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name                   text not null,
  tagline                text,
  description            text,
  badge                  text,
  theme                  text not null default 'oat'
                           check (theme in ('oat', 'sage', 'honey', 'blush', 'forest', 'ink')),
  monthly_amount_kobo    bigint not null check (monthly_amount_kobo > 0),
  registration_fee_kobo  bigint not null default 300000 check (registration_fee_kobo >= 0),
  savings_return_kobo    bigint not null default 0 check (savings_return_kobo >= 0),
  duration_months        smallint not null default 12 check (duration_months between 1 and 24),
  start_month            date not null check (extract(day from start_month) = 1),
  due_day                smallint not null default 28 check (due_day between 1 and 28),
  is_open                boolean not null default true,
  sort_order             integer not null default 0,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  unique (cycle_year, slug)
);

create index packages_cycle_idx on public.packages (cycle_year, sort_order);

create trigger packages_updated_at before update on public.packages
  for each row execute function public.set_updated_at();

create table public.package_items (
  id          uuid primary key default gen_random_uuid(),
  package_id  uuid not null references public.packages (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  quantity    numeric(12, 2) not null check (quantity > 0),
  unit        text not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index package_items_package_idx on public.package_items (package_id, sort_order);

-- ---------------------------------------------------------------------------
-- Enrollments: a customer on a package for a cycle
-- ---------------------------------------------------------------------------
create table public.enrollments (
  id                         uuid primary key default gen_random_uuid(),
  user_id                    uuid not null references public.profiles (id) on delete cascade,
  package_id                 uuid not null references public.packages (id) on delete restrict,
  collection_point_id        uuid references public.collection_points (id) on delete set null,
  customer_code              text unique,          -- LUX-2027-000001, assigned on first payment
  referral_code              text unique,          -- FUNMI2027, assigned on first payment
  referred_by_enrollment_id  uuid references public.enrollments (id) on delete set null,
  status                     public.enrollment_status not null default 'pending_payment',
  -- price snapshot taken at sign-up; later package edits never change it
  monthly_amount_kobo        bigint not null,
  registration_fee_kobo      bigint not null,
  savings_return_kobo        bigint not null default 0,
  duration_months            smallint not null,
  credit_kobo                bigint not null default 0 check (credit_kobo >= 0),
  registration_paid_at       timestamptz,
  -- fulfilment
  fulfilment_status          public.fulfilment_status not null default 'not_started',
  collection_scheduled_for   timestamptz,
  fulfilment_note            text,
  fulfilment_updated_at      timestamptz,
  -- savings return
  savings_return_status      public.savings_return_status not null default 'not_applicable',
  savings_return_paid_at     timestamptz,
  savings_return_reference   text,
  savings_return_paid_by     uuid references public.profiles (id) on delete set null,
  -- lifecycle
  terms_accepted_at          timestamptz not null default now(),
  activated_at               timestamptz,
  completed_at               timestamptz,
  cancelled_at               timestamptz,
  cancel_reason              text,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create unique index enrollments_one_open_per_package
  on public.enrollments (user_id, package_id) where status <> 'cancelled';
create index enrollments_user_idx on public.enrollments (user_id);
create index enrollments_package_status_idx on public.enrollments (package_id, status);
create index enrollments_referred_by_idx on public.enrollments (referred_by_enrollment_id);
create index enrollments_collection_point_idx on public.enrollments (collection_point_id);

create trigger enrollments_updated_at before update on public.enrollments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Payments (one row per gateway transaction) and their ledger lines
-- ---------------------------------------------------------------------------
create table public.payments (
  id                       uuid primary key default gen_random_uuid(),
  reference                text not null unique,
  enrollment_id            uuid not null references public.enrollments (id) on delete cascade,
  user_id                  uuid not null references public.profiles (id) on delete cascade,
  provider                 public.payment_provider not null default 'paystack',
  status                   public.payment_status not null default 'pending',
  expected_amount_kobo     bigint not null check (expected_amount_kobo > 0),
  amount_kobo              bigint not null check (amount_kobo > 0),
  includes_registration    boolean not null default false,
  months_requested         smallint not null default 1,
  channel                  text,
  fees_kobo                bigint,
  gateway_transaction_id   bigint,
  gateway_response         text,
  receipt_number           text unique,
  paid_at                  timestamptz,
  needs_review             boolean not null default false,
  note                     text,
  recorded_by              uuid references public.profiles (id) on delete set null,
  raw                      jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index payments_enrollment_idx on public.payments (enrollment_id, created_at desc);
create index payments_user_idx on public.payments (user_id, created_at desc);
create index payments_status_paid_idx on public.payments (status, paid_at desc);

create trigger payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Installments: the month-by-month schedule
-- ---------------------------------------------------------------------------
create table public.installments (
  id             uuid primary key default gen_random_uuid(),
  enrollment_id  uuid not null references public.enrollments (id) on delete cascade,
  month_index    smallint not null check (month_index >= 1),
  period_month   date not null,
  due_date       date not null,
  amount_kobo    bigint not null check (amount_kobo > 0),
  paid_at        timestamptz,
  payment_id     uuid references public.payments (id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (enrollment_id, month_index)
);

create index installments_enrollment_idx on public.installments (enrollment_id, month_index);
create index installments_unpaid_due_idx on public.installments (due_date) where paid_at is null;

create table public.payment_lines (
  id              uuid primary key default gen_random_uuid(),
  payment_id      uuid not null references public.payments (id) on delete cascade,
  enrollment_id   uuid not null references public.enrollments (id) on delete cascade,
  installment_id  uuid references public.installments (id) on delete set null,
  line_type       public.payment_line_type not null,
  amount_kobo     bigint not null,
  description     text,
  created_at      timestamptz not null default now()
);

create index payment_lines_payment_idx on public.payment_lines (payment_id);
create index payment_lines_enrollment_idx on public.payment_lines (enrollment_id, line_type);

-- ---------------------------------------------------------------------------
-- Customer-facing timeline
-- ---------------------------------------------------------------------------
create table public.enrollment_events (
  id             bigint generated always as identity primary key,
  enrollment_id  uuid not null references public.enrollments (id) on delete cascade,
  kind           text not null,
  title          text not null,
  body           text,
  created_at     timestamptz not null default now()
);

create index enrollment_events_enrollment_idx on public.enrollment_events (enrollment_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Email templates (editable wording) and delivery log
-- ---------------------------------------------------------------------------
create table public.email_templates (
  key          text primary key,
  name         text not null,
  description  text,
  subject      text not null,
  body         text not null,
  variables    text[] not null default '{}',
  is_enabled   boolean not null default true,
  updated_by   uuid references public.profiles (id) on delete set null,
  updated_at   timestamptz not null default now()
);

create trigger email_templates_updated_at before update on public.email_templates
  for each row execute function public.set_updated_at();

create table public.email_log (
  id              uuid primary key default gen_random_uuid(),
  template_key    text,
  to_email        text not null,
  user_id         uuid references public.profiles (id) on delete set null,
  enrollment_id   uuid references public.enrollments (id) on delete set null,
  subject         text not null,
  status          text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  provider        text,
  provider_id     text,
  error           text,
  dedupe_key      text unique,
  created_at      timestamptz not null default now()
);

create index email_log_created_idx on public.email_log (created_at desc);
create index email_log_user_idx on public.email_log (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Staff activity log
-- ---------------------------------------------------------------------------
create table public.activity_log (
  id           bigint generated always as identity primary key,
  actor_id     uuid references public.profiles (id) on delete set null,
  actor_name   text,
  action       text not null,
  entity_type  text,
  entity_id    text,
  summary      text not null,
  details      jsonb,
  created_at   timestamptz not null default now()
);

create index activity_log_created_idx on public.activity_log (created_at desc);
create index activity_log_actor_idx on public.activity_log (actor_id, created_at desc);
create index activity_log_entity_idx on public.activity_log (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Business settings (single row)
-- ---------------------------------------------------------------------------
create table public.app_settings (
  id                      smallint primary key default 1 check (id = 1),
  business_name           text not null default 'Luxuriate Foodstuff',
  support_email           text,
  support_phone           text,
  whatsapp_number         text,
  office_address          text,
  reminder_days_before    smallint not null default 3 check (reminder_days_before between 0 and 14),
  late_grace_days         smallint not null default 7 check (late_grace_days between 0 and 60),
  send_overdue_notices    boolean not null default true,
  terms_content           text not null default '',
  terms_updated_at        timestamptz,
  updated_at              timestamptz not null default now()
);

create trigger app_settings_updated_at before update on public.app_settings
  for each row execute function public.set_updated_at();

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Atomic counters for customer IDs and receipt numbers
-- ---------------------------------------------------------------------------
create table public.code_counters (
  scope       text primary key,
  last_value  bigint not null default 0
);
