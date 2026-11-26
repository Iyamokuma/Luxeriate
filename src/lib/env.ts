import "server-only";

/**
 * Values still carrying the template text from .env.example (sk_test_xxx,
 * YOUR-PROJECT, change-me…) count as unset, so a half-filled file can't send
 * a dummy key to Paystack or Supabase.
 */
function real(value: string | undefined) {
  const v = value?.trim();
  if (!v || /xxx|YOUR[-_]|change-me/i.test(v)) return "";
  return v;
}

function required(name: string, value: string | undefined) {
  const v = real(value);
  if (!v) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return v;
}

export const env = {
  get siteUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  },
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabasePublishableKey() {
    return required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  },
  get supabaseSecretKey() {
    return required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
  get paystackSecretKey() {
    return real(process.env.PAYSTACK_SECRET_KEY);
  },
  /** Simulated checkout: only when explicitly enabled, never in production. */
  get paystackTestMode() {
    return process.env.PAYSTACK_TEST_MODE === "true" && process.env.NODE_ENV !== "production";
  },
  get dvaEnabled() {
    return process.env.PAYSTACK_DVA_ENABLED === "true";
  },
  get dvaPreferredBank() {
    return process.env.PAYSTACK_DVA_PREFERRED_BANK ?? "wema-bank";
  },
  get emailProvider() {
    return (process.env.EMAIL_PROVIDER ?? "console") as "resend" | "smtp" | "console";
  },
  get emailFrom() {
    return process.env.EMAIL_FROM ?? "Luxuriate Foodstuff <onboarding@resend.dev>";
  },
  get emailReplyTo() {
    return process.env.EMAIL_REPLY_TO || undefined;
  },
  get cronSecret() {
    return real(process.env.CRON_SECRET);
  },
};
