import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { firstName, formatDate, formatDateTime, formatMonth, naira } from "@/lib/format";
import { bodyToHtml, bodyToText, fill, layout, type Vars } from "./render";
import { sendEmail, sendEmailBatch } from "./send";
import type { EmailTemplate, FinalizeResult } from "@/types/db";

type Deliver = {
  key: string;
  to: string;
  vars: Vars;
  userId?: string | null;
  enrollmentId?: string | null;
  dedupeKey?: string;
};

async function settings() {
  const admin = createAdminClient();
  const { data } = await admin.from("app_settings").select("business_name, support_email").eq("id", 1).single();
  return { businessName: data?.business_name ?? "Luxuriate Foodstuff", supportEmail: data?.support_email ?? undefined };
}

function baseVars(businessName: string): Vars {
  return {
    business_name: businessName,
    site_url: env.siteUrl,
    dashboard_url: `${env.siteUrl}/dashboard`,
    pay_url: `${env.siteUrl}/dashboard?pay=1`,
    login_url: `${env.siteUrl}/login`,
    reset_url: `${env.siteUrl}/forgot-password`,
  };
}

export async function renderEmail(template: Pick<EmailTemplate, "subject" | "body">, vars: Vars, businessName: string) {
  const subject = fill(template.subject, vars).replace(/\s+/g, " ").trim();
  const html = layout({
    contentHtml: bodyToHtml(template.body, vars),
    preheader: bodyToText(template.body, vars).split("\n").find((l) => l.trim() && !/^hi\b/i.test(l)) ?? subject,
    businessName,
    siteUrl: env.siteUrl,
  });
  return { subject, html, text: bodyToText(template.body, vars) };
}

/** Render a stored template and send it, recording the result in email_log. */
export async function deliver({ key, to, vars, userId, enrollmentId, dedupeKey }: Deliver) {
  const admin = createAdminClient();
  try {
    if (dedupeKey) {
      const { data: existing } = await admin.from("email_log").select("id, status").eq("dedupe_key", dedupeKey).maybeSingle();
      if (existing?.status === "sent") return { ok: true, skipped: true };
    }
    const [{ data: tpl }, s] = await Promise.all([
      admin.from("email_templates").select("*").eq("key", key).maybeSingle<EmailTemplate>(),
      settings(),
    ]);
    if (!tpl) throw new Error(`Email template "${key}" is missing`);
    const allVars = { ...baseVars(s.businessName), ...vars };
    const rendered = await renderEmail(tpl, allVars, s.businessName);

    const row = {
      template_key: key,
      to_email: to,
      user_id: userId ?? null,
      enrollment_id: enrollmentId ?? null,
      subject: rendered.subject,
      dedupe_key: dedupeKey ?? null,
    };

    if (!tpl.is_enabled) {
      await admin.from("email_log").upsert({ ...row, status: "skipped", error: "Template disabled" }, { onConflict: "dedupe_key" });
      return { ok: true, skipped: true };
    }

    const result = await sendEmail({ to, subject: rendered.subject, html: rendered.html, text: rendered.text, replyTo: s.supportEmail });
    const log = {
      ...row,
      status: result.ok ? "sent" : "failed",
      provider: result.provider,
      provider_id: result.ok ? (result.id ?? null) : null,
      error: result.ok ? null : result.error,
    };
    if (dedupeKey) await admin.from("email_log").upsert(log, { onConflict: "dedupe_key" });
    else await admin.from("email_log").insert(log);
    if (!result.ok) console.error(`[email] ${key} to ${to} failed: ${result.error}`);
    return { ok: result.ok };
  } catch (err) {
    console.error(`[email] ${key} to ${to} crashed`, err);
    return { ok: false };
  }
}

/** Welcome, receipt and completion emails after a confirmed payment. */
export async function notifyPaymentResult(r: FinalizeResult) {
  if (!r.processed) return;
  const admin = createAdminClient();
  const { data: e } = await admin
    .from("enrollment_overview")
    .select("collection_point_name, monthly_amount_kobo, savings_return_kobo, customer_code, referral_code, duration_months")
    .eq("id", r.enrollment_id)
    .single();

  const common: Vars = {
    first_name: firstName(r.full_name),
    full_name: r.full_name,
    customer_id: r.customer_code ?? e?.customer_code ?? "",
    package_name: r.package_name,
  };

  if (r.activated) {
    await deliver({
      key: "welcome",
      to: r.email,
      userId: r.user_id,
      enrollmentId: r.enrollment_id,
      dedupeKey: `welcome:${r.enrollment_id}`,
      vars: {
        ...common,
        login_email: r.email,
        monthly_amount: naira(e?.monthly_amount_kobo),
        collection_point: e?.collection_point_name ?? "your chosen collection point",
        referral_code: r.referral_code ?? e?.referral_code ?? "",
      },
    });
  }

  const labels = r.month_labels ?? [];
  const monthsLabel =
    labels.length === 0
      ? r.registration_paid
        ? "your registration"
        : "your account (held as credit)"
      : (r.registration_paid ? "registration and " : "") +
        (labels.length <= 2 ? labels.join(" and ") : `${labels[0]} to ${labels[labels.length - 1]}`);

  await deliver({
    key: "payment_confirmation",
    to: r.email,
    userId: r.user_id,
    enrollmentId: r.enrollment_id,
    dedupeKey: `payment:${r.payment_id}`,
    vars: {
      ...common,
      amount: naira(r.amount_kobo),
      months_label: monthsLabel,
      receipt_number: r.receipt_number,
      total_paid: naira(r.paid_kobo),
      total_due: naira(r.total_kobo),
      paid_count: r.paid_count,
      duration: r.duration_months,
      balance: naira(r.balance_kobo),
      receipt_url: `${env.siteUrl}/api/receipts/${r.payment_id}`,
    },
  });

  if (r.completed) {
    const savings = Number(e?.savings_return_kobo ?? 0);
    await deliver({
      key: "contribution_completed",
      to: r.email,
      userId: r.user_id,
      enrollmentId: r.enrollment_id,
      dedupeKey: `completed:${r.enrollment_id}`,
      vars: {
        ...common,
        duration: r.duration_months,
        collection_point: e?.collection_point_name ?? "your collection point",
        savings_line: savings > 0 ? `Your savings return of **${naira(savings)}** will be paid to you separately.` : "",
      },
    });
  }
}

export type FulfilmentRow = {
  enrollment_id: string;
  user_id: string;
  email: string;
  full_name: string;
  customer_code: string | null;
  package_name: string;
  collection_point_name: string | null;
  collection_point_address: string | null;
  collection_scheduled_for: string | null;
};

export async function notifyFulfilment(rows: FulfilmentRow[], status: string, note?: string | null) {
  const key = `fulfilment_${status}`;
  for (const r of rows) {
    await deliver({
      key,
      to: r.email,
      userId: r.user_id,
      enrollmentId: r.enrollment_id,
      dedupeKey: `${key}:${r.enrollment_id}:${r.collection_scheduled_for ?? ""}`,
      vars: {
        first_name: firstName(r.full_name),
        full_name: r.full_name,
        customer_id: r.customer_code ?? "",
        package_name: r.package_name,
        collection_point: r.collection_point_name ?? "your collection point",
        collection_address: r.collection_point_address ?? "",
        collection_date: r.collection_scheduled_for ? formatDateTime(r.collection_scheduled_for) : "",
        note: note ?? "",
      },
    });
  }
}

export async function notifySavingsPaid(r: {
  enrollment_id: string;
  user_id: string;
  email: string;
  full_name: string;
  package_name: string;
  customer_code: string | null;
  savings_return_kobo: number;
  reference: string | null;
}) {
  await deliver({
    key: "savings_return_paid",
    to: r.email,
    userId: r.user_id,
    enrollmentId: r.enrollment_id,
    dedupeKey: `savings:${r.enrollment_id}`,
    vars: {
      first_name: firstName(r.full_name),
      full_name: r.full_name,
      customer_id: r.customer_code ?? "",
      package_name: r.package_name,
      savings_return: naira(r.savings_return_kobo),
      reference_line: r.reference ? `Transfer reference: **${r.reference}**` : "",
    },
  });
}

export type ReminderCandidate = {
  kind: "reminder" | "overdue";
  installment_id: string;
  enrollment_id: string;
  user_id: string;
  email: string;
  full_name: string;
  customer_code: string | null;
  package_name: string;
  period_month: string;
  due_date: string;
  amount_kobo: number;
  paid_count: number;
  duration_months: number;
};

export async function sendReminder(c: ReminderCandidate) {
  return deliver({
    key: c.kind === "reminder" ? "payment_reminder" : "payment_overdue",
    to: c.email,
    userId: c.user_id,
    enrollmentId: c.enrollment_id,
    dedupeKey: `${c.kind}:${c.installment_id}`,
    vars: {
      first_name: firstName(c.full_name),
      full_name: c.full_name,
      customer_id: c.customer_code ?? "",
      package_name: c.package_name,
      amount: naira(c.amount_kobo),
      month_label: formatMonth(c.period_month),
      due_date: formatDate(c.due_date, "long"),
      paid_count: c.paid_count,
      duration: c.duration_months,
    },
  });
}

export async function sendAccountLink(kind: "staff_invite" | "password_reset", to: string, name: string, actionUrl: string, inviter?: string) {
  return deliver({
    key: kind,
    to,
    vars: { first_name: firstName(name), action_url: actionUrl, inviter_name: inviter ?? "The owner" },
  });
}

/** One-off email to many customers (Admin → Emails → Send a message). */
export async function sendBroadcast(
  recipients: { email: string; full_name: string; user_id: string; enrollment_id: string; customer_code: string | null; package_name: string }[],
  subject: string,
  body: string,
  broadcastId: string,
) {
  const s = await settings();
  const admin = createAdminClient();
  const rendered = await Promise.all(
    recipients.map((r) =>
      renderEmail(
        { subject, body },
        {
          ...baseVars(s.businessName),
          first_name: firstName(r.full_name),
          full_name: r.full_name,
          customer_id: r.customer_code ?? "",
          package_name: r.package_name,
        },
        s.businessName,
      ),
    ),
  );
  const results = await sendEmailBatch(rendered.map((m, i) => ({ to: recipients[i].email, ...m, replyTo: s.supportEmail })));
  const rows = results.map((result, i) => ({
    template_key: "broadcast",
    to_email: recipients[i].email,
    user_id: recipients[i].user_id,
    enrollment_id: recipients[i].enrollment_id,
    subject: rendered[i].subject,
    status: result.ok ? "sent" : "failed",
    provider: result.provider,
    provider_id: result.ok ? (result.id ?? null) : null,
    error: result.ok ? null : result.error,
    dedupe_key: `broadcast:${broadcastId}:${recipients[i].enrollment_id}`,
  }));
  for (let i = 0; i < rows.length; i += 500) await admin.from("email_log").insert(rows.slice(i, i + 500));
  return { sent: results.filter((r) => r.ok).length, failed: results.filter((r) => !r.ok).length };
}
