import "server-only";
import { env } from "@/lib/env";
import { naira, relativeTime } from "@/lib/format";
import type { SystemMonitor } from "@/types/db";

export type HealthStatus = "ok" | "warn" | "error" | "idle";

export type HealthCheck = {
  key: "database" | "payments" | "webhooks" | "email" | "reminders" | "signups" | "security";
  label: string;
  status: HealthStatus;
  value: string;
  detail: string;
  href?: string;
};

export type ReadinessItem = { label: string; ok: boolean; detail: string; href?: string };

type Probe<T> = { ok: true; data: T } | { ok: false; error: string };

async function probe<T>(url: string, init: RequestInit): Promise<Probe<T>> {
  try {
    const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(3500) });
    const json = (await res.json().catch(() => null)) as T | null;
    if (!res.ok || !json) return { ok: false, error: `Responded ${res.status}` };
    return { ok: true, data: json };
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    return { ok: false, error: name === "TimeoutError" ? "Timed out" : "Unreachable" };
  }
}

/** Live checks against the services the app depends on. Each one is bounded by a short timeout. */
export async function probeServices() {
  const key = env.paystackSecretKey;
  const [auth, paystack] = await Promise.all([
    probe<{ disable_signup?: boolean }>(`${env.supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: env.supabasePublishableKey },
    }),
    key
      ? probe<{ status: boolean; message: string; data: { currency: string; balance: number }[] }>("https://api.paystack.co/balance", {
          headers: { Authorization: `Bearer ${key}` },
        })
      : Promise.resolve(null),
  ]);
  return { auth, paystack, paystackLive: key.startsWith("sk_live_") };
}

const HOUR = 3_600_000;

function age(at: string) {
  return Date.now() - new Date(at).getTime();
}

function bytes(n: number) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

export type ServiceProbes = Awaited<ReturnType<typeof probeServices>>;

/** Turns the monitor figures and the live probes into the health panel and launch checklist. */
export function buildHealth(monitor: SystemMonitor | null, db: { ms: number; error: string | null }, probes: ServiceProbes) {
  const { auth, paystack, paystackLive } = probes;
  const sys = monitor?.system;
  const jobs = new Map((sys?.jobs ?? []).map((j) => [j.source, j]));
  const checks: HealthCheck[] = [];

  // Database
  checks.push(
    db.error
      ? { key: "database", label: "Database", status: "error", value: "Error", detail: db.error }
      : {
          key: "database",
          label: "Database",
          status: db.ms > 1500 ? "warn" : "ok",
          value: `${db.ms} ms`,
          detail: sys ? `${bytes(sys.db_bytes)} stored` : "Responding",
        },
  );

  // Payments
  if (!env.paystackSecretKey) {
    checks.push(
      env.paystackTestMode
        ? { key: "payments", label: "Payments", status: "warn", value: "Simulated", detail: "Add a Paystack key to take real payments", href: "/admin/settings" }
        : { key: "payments", label: "Payments", status: "error", value: "Not set up", detail: "PAYSTACK_SECRET_KEY is missing" },
    );
  } else if (paystack && !paystack.ok) {
    checks.push({ key: "payments", label: "Payments", status: "error", value: "Unreachable", detail: `Paystack: ${paystack.error}` });
  } else {
    const ngn = paystack?.ok ? paystack.data.data?.find((b) => b.currency === "NGN") : undefined;
    const balance = ngn ? `Balance ${naira(ngn.balance)}` : "Connected";
    checks.push(
      paystackLive
        ? { key: "payments", label: "Payments", status: "ok", value: "Live", detail: balance }
        : { key: "payments", label: "Payments", status: "warn", value: "Test keys", detail: `${balance} · no real money` },
    );
  }

  // Webhooks
  const hook = jobs.get("paystack.webhook");
  const hookErrors = sys?.webhooks_24h.error ?? 0;
  if (sys) {
    checks.push(
      hookErrors > 0
        ? { key: "webhooks", label: "Webhooks", status: "error", value: `${hookErrors} failed`, detail: "In the last 24 hours" }
        : hook
          ? { key: "webhooks", label: "Webhooks", status: "ok", value: "Receiving", detail: `Last event ${relativeTime(hook.created_at)}` }
          : {
              key: "webhooks",
              label: "Webhooks",
              status: paystackLive ? "warn" : "idle",
              value: "No events yet",
              detail: paystackLive ? "Check the webhook URL in Paystack" : "Arrive once Paystack is connected",
            },
    );
  }

  // Email
  const em = monitor?.emails;
  const provider = env.emailProvider;
  const providerName = provider === "resend" ? "Resend" : provider === "smtp" ? "SMTP" : "Console";
  const configured =
    provider === "resend" ? Boolean(process.env.RESEND_API_KEY) : provider === "smtp" ? Boolean(process.env.SMTP_HOST) : false;
  const delivered = em ? em.sent_30d + em.failed_30d : 0;
  const rate = em && delivered ? Math.round((em.sent_30d / delivered) * 100) : null;
  checks.push(
    provider === "console"
      ? { key: "email", label: "Email", status: "warn", value: "Console only", detail: "Printed to the server log, not delivered" }
      : !configured
        ? { key: "email", label: "Email", status: "error", value: "Missing key", detail: `${providerName} is selected but not configured` }
        : em && em.failed_24h > 0
          ? { key: "email", label: "Email", status: "warn", value: `${em.failed_24h} failed`, detail: "In the last 24 hours", href: "/admin/emails" }
          : { key: "email", label: "Email", status: "ok", value: providerName, detail: rate === null ? "Ready" : `${rate}% delivered · 30 days` },
  );

  // Reminder job
  const cron = jobs.get("cron.reminders");
  if (sys) {
    checks.push(
      !env.cronSecret
        ? { key: "reminders", label: "Reminders", status: "error", value: "No secret", detail: "Set CRON_SECRET to run the daily job" }
        : !cron
          ? { key: "reminders", label: "Reminders", status: "warn", value: "Never run", detail: "Schedule the daily job (08:00 Lagos)" }
          : cron.status === "error"
            ? { key: "reminders", label: "Reminders", status: "error", value: "Failed", detail: cron.summary }
            : age(cron.created_at) > 26 * HOUR
              ? { key: "reminders", label: "Reminders", status: "warn", value: "Missed", detail: `Last ran ${relativeTime(cron.created_at)}` }
              : { key: "reminders", label: "Reminders", status: "ok", value: relativeTime(cron.created_at), detail: cron.summary },
    );
  }

  // Sign-ups
  checks.push(
    !auth.ok
      ? { key: "signups", label: "Sign-ups", status: "error", value: "Unknown", detail: `Supabase Auth: ${auth.error}` }
      : auth.data.disable_signup
        ? { key: "signups", label: "Sign-ups", status: "ok", value: "Invite only", detail: "Accounts open through the join form" }
        : { key: "signups", label: "Sign-ups", status: "warn", value: "Open", detail: "Turn off public sign-ups in Supabase" },
  );

  // Row-level security
  if (sys) {
    const { rls } = sys;
    checks.push(
      rls.unprotected.length
        ? { key: "security", label: "Data access", status: "error", value: `${rls.unprotected.length} exposed`, detail: rls.unprotected.join(", ") }
        : { key: "security", label: "Data access", status: "ok", value: `${rls.protected}/${rls.total} locked`, detail: "Row-level security on every table" },
    );
  }

  // Launch readiness (owners and settings managers)
  const readiness: ReadinessItem[] | null = sys
    ? [
        {
          label: "Real payments",
          ok: paystackLive && !env.paystackTestMode,
          detail: paystackLive ? "Live Paystack key in use" : env.paystackSecretKey ? "Using test keys" : "Checkout is simulated",
        },
        {
          label: "Webhook signature checks",
          ok: Boolean(env.paystackSecretKey),
          detail: env.paystackSecretKey ? "Verified with your Paystack key" : "Needs a Paystack key",
        },
        { label: "Email delivery", ok: provider !== "console" && configured, detail: provider === "console" ? "Console only" : `${providerName}${configured ? "" : " (not configured)"}` },
        { label: "Daily reminder job", ok: Boolean(env.cronSecret && cron && cron.status !== "error"), detail: cron ? `Last ran ${relativeTime(cron.created_at)}` : env.cronSecret ? "Not run yet" : "CRON_SECRET missing" },
        { label: "Public sign-ups closed", ok: auth.ok && Boolean(auth.data.disable_signup), detail: auth.ok && auth.data.disable_signup ? "Invite only" : "Anyone can create an account" },
        { label: "Row-level security", ok: sys.rls.unprotected.length === 0, detail: `${sys.rls.protected} of ${sys.rls.total} tables` },
        {
          label: "Secure site address",
          ok: env.siteUrl.startsWith("https://"),
          detail: env.siteUrl.replace(/^https?:\/\//, ""),
        },
        { label: "Support contacts", ok: Boolean(sys.settings?.support_set), detail: sys.settings?.support_set ? "Shown to customers" : "Add them in Settings", href: "/admin/settings" },
        { label: "Terms published", ok: Boolean(sys.settings?.terms_set), detail: sys.settings?.terms_set ? "Customers accept them at sign-up" : "Add them in Settings", href: "/admin/settings" },
      ]
    : null;

  return { checks, readiness, checkedAt: new Date().toISOString() };
}
