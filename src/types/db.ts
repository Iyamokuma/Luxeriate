import type { FulfilmentStatus, PackageTheme, Permission } from "@/lib/constants";

export type AppRole = "customer" | "staff" | "owner";
export type EnrollmentStatus = "pending_payment" | "active" | "completed" | "cancelled";
export type SavingsReturnStatus = "not_applicable" | "pending" | "paid";
export type PaymentStatus = "pending" | "success" | "failed" | "abandoned";
export type PaymentProvider = "paystack" | "paystack_dva" | "manual" | "test";
export type InstallmentState = "paid" | "due" | "late" | "upcoming" | "cancelled";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  state: string | null;
  lga: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  role: AppRole;
  permissions: Permission[];
  is_active: boolean;
  dva_account_number: string | null;
  dva_account_name: string | null;
  dva_bank_name: string | null;
  created_at: string;
}

export interface CollectionPoint {
  id: string;
  name: string;
  address: string;
  state: string | null;
  phone: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface PackageItem {
  id: string;
  package_id: string;
  name: string;
  quantity: number;
  unit: string;
  sort_order: number;
}

export interface Package {
  id: string;
  cycle_year: number;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  badge: string | null;
  theme: PackageTheme;
  monthly_amount_kobo: number;
  registration_fee_kobo: number;
  savings_return_kobo: number;
  duration_months: number;
  start_month: string;
  due_day: number;
  is_open: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PackageWithItems extends Package {
  package_items: PackageItem[];
}

export interface EnrollmentOverview {
  id: string;
  user_id: string;
  package_id: string;
  collection_point_id: string | null;
  customer_code: string | null;
  referral_code: string | null;
  referred_by_enrollment_id: string | null;
  status: EnrollmentStatus;
  monthly_amount_kobo: number;
  registration_fee_kobo: number;
  savings_return_kobo: number;
  duration_months: number;
  credit_kobo: number;
  registration_paid_at: string | null;
  fulfilment_status: FulfilmentStatus;
  collection_scheduled_for: string | null;
  fulfilment_note: string | null;
  fulfilment_updated_at: string | null;
  savings_return_status: SavingsReturnStatus;
  savings_return_paid_at: string | null;
  savings_return_reference: string | null;
  activated_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  package_name: string;
  package_slug: string;
  cycle_year: number;
  package_theme: PackageTheme;
  package_start_month: string;
  full_name: string;
  email: string;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  state: string | null;
  lga: string | null;
  collection_point_name: string | null;
  collection_point_address: string | null;
  paid_count: number;
  paid_kobo: number;
  total_kobo: number;
  outstanding_kobo: number;
  next_due_date: string | null;
  late_count: number;
  last_paid_at: string | null;
  referred_by_code: string | null;
}

export interface InstallmentOverview {
  id: string;
  enrollment_id: string;
  month_index: number;
  period_month: string;
  due_date: string;
  amount_kobo: number;
  paid_at: string | null;
  payment_id: string | null;
  state: InstallmentState;
  enrollment_status: EnrollmentStatus;
  user_id: string;
  customer_code: string | null;
  package_id: string;
  package_name: string;
  cycle_year: number;
  full_name: string;
  phone: string | null;
  email: string;
}

export interface PaymentOverview {
  id: string;
  reference: string;
  enrollment_id: string;
  user_id: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  expected_amount_kobo: number;
  amount_kobo: number;
  includes_registration: boolean;
  months_requested: number;
  channel: string | null;
  fees_kobo: number | null;
  receipt_number: string | null;
  paid_at: string | null;
  needs_review: boolean;
  note: string | null;
  created_at: string;
  customer_code: string | null;
  package_id: string;
  package_name: string;
  cycle_year: number;
  full_name: string;
  phone: string | null;
  email: string;
  registration_kobo: number;
  contribution_kobo: number;
  months_covered: number;
  months_label: string | null;
}

export interface EnrollmentEvent {
  id: number;
  enrollment_id: string;
  kind: string;
  title: string;
  body: string | null;
  created_at: string;
}

export interface AppSettings {
  business_name: string;
  support_email: string | null;
  support_phone: string | null;
  whatsapp_number: string | null;
  office_address: string | null;
  reminder_days_before: number;
  late_grace_days: number;
  send_overdue_notices: boolean;
  terms_content: string;
  terms_updated_at: string | null;
}

export interface EmailTemplate {
  key: string;
  name: string;
  description: string | null;
  subject: string;
  body: string;
  variables: string[];
  is_enabled: boolean;
  updated_at: string;
}

export interface FinalizeResult {
  processed: boolean;
  reason?: string;
  payment_id: string;
  reference: string;
  enrollment_id: string;
  user_id: string;
  email: string;
  full_name: string;
  package_name: string;
  amount_kobo: number;
  registration_paid: boolean;
  months_paid: number;
  month_labels: string[];
  paid_count: number;
  duration_months: number;
  paid_kobo: number;
  total_kobo: number;
  balance_kobo: number;
  next_due_date: string | null;
  activated: boolean;
  completed: boolean;
  customer_code: string | null;
  referral_code: string | null;
  receipt_number: string;
  needs_review: boolean;
}

export interface AdminOverview {
  total_customers: number;
  pending_customers: number;
  active_contributors: number;
  completed_customers: number;
  late_customers: number;
  contributions_kobo: number;
  registration_fees_kobo: number;
  credit_kobo: number;
  outstanding_kobo: number;
  overdue_kobo: number;
  savings_pending_kobo: number;
  needs_review: number;
  per_package: {
    id: string;
    name: string;
    sort_order: number;
    theme: PackageTheme;
    monthly_amount_kobo: number;
    customers: number;
    active: number;
    completed: number;
    collected_kobo: number;
  }[];
}

export interface MonthlyCollection {
  month: string;
  contributions_kobo: number;
  registration_fees_kobo: number;
  credit_kobo: number;
  total_kobo: number;
  payments_count: number;
}

export interface ProcurementRow {
  item_name: string;
  unit: string;
  total_quantity: number;
  customers: number;
  breakdown: { package: string; customers: number; per_customer: number; quantity: number }[];
}

/** public.system_monitor(): each section is present only for staff allowed to see it. */
export interface SystemMonitor {
  today: string;
  generated_at: string;
  cycle_year: number;
  money?: {
    all_time_kobo: number;
    payments_count: number;
    fees_kobo: number;
    today_kobo: number;
    today_count: number;
    week_kobo: number;
    mtd_kobo: number;
    prev_mtd_kobo: number;
    last_payment_at: string | null;
    daily: { d: string; c: number; f: number; n: number }[];
    attempts: { success: number; failed: number; abandoned: number; open: number };
    channels: { channel: string; n: number; kobo: number }[];
    forecast: { m: string; due_kobo: number; paid_kobo: number; customers: number }[];
    next_due: { date: string; kobo: number; customers: number } | null;
    overdue_kobo: number;
    overdue_customers: number;
    credit_held_kobo: number;
    needs_review: number;
  };
  customers?: {
    registered: number;
    pending: number;
    stalled: number;
    active: number;
    completed: number;
    cancelled: number;
    late: number;
    accounts: number;
    new_7d: number;
    activated_7d: number;
    daily: { d: string; joined: number; activated: number }[];
    by_state: { state: string; n: number }[];
  };
  operations?: {
    fulfilment: {
      not_started: number;
      preparing: number;
      ready: number;
      collection_scheduled: number;
      collected: number;
      completed_waiting: number;
      scheduled_7d: number;
    };
    savings: { pending: number; pending_kobo: number; paid: number; paid_kobo: number };
    collection_points: number;
  };
  emails?: {
    sent_30d: number;
    failed_30d: number;
    skipped_30d: number;
    failed_24h: number;
    last_sent_at: string | null;
    provider: string | null;
    daily: { d: string; sent: number; failed: number; skipped: number }[];
    by_template: { key: string; name: string; sent: number; failed: number }[];
    failures: { to: string; subject: string; error: string | null; at: string; template: string | null }[];
    templates: { enabled: number; total: number };
  };
  team?: {
    members: {
      id: string;
      full_name: string;
      email: string;
      role: AppRole;
      is_active: boolean;
      permissions: number;
      last_sign_in_at: string | null;
      last_action_at: string | null;
      actions_7d: number;
    }[];
  };
  system?: {
    db_bytes: number;
    rows: Record<"profiles" | "enrollments" | "payments" | "installments" | "email_log" | "activity_log" | "system_events", number>;
    rls: { total: number; protected: number; unprotected: string[] };
    auth: { users: number; signins_24h: number; unconfirmed: number };
    jobs: { source: string; status: "ok" | "error" | "skipped"; summary: string; created_at: string; duration_ms: number | null }[];
    webhooks_24h: { ok: number; error: number };
    errors_24h: number;
    settings: {
      reminder_days_before: number;
      late_grace_days: number;
      send_overdue_notices: boolean;
      terms_set: boolean;
      support_set: boolean;
    } | null;
  };
  stream: {
    kind: "payment" | "payment_failed" | "signup" | "completed" | "email_failed" | "staff" | "system" | "system_error";
    at: string;
    title: string;
    detail: string | null;
    kobo: number | null;
    ref: string | null;
  }[];
}
