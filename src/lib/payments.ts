import "server-only";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { initializeTransaction, summarize, verifyTransaction } from "@/lib/paystack";
import { notifyPaymentResult } from "@/lib/email/notify";
import { ensureDedicatedAccount } from "@/lib/dva";
import type { FinalizeResult } from "@/types/db";

export type StartPaymentResult =
  | {
      ok: true;
      mode: "paystack" | "test";
      reference: string;
      amountKobo: number;
      accessCode?: string;
      authorizationUrl?: string;
      email: string;
    }
  | { ok: false; error: string };

const FRIENDLY: Record<string, string> = {
  ENROLLMENT_NOT_FOUND: "We couldn't find that package on your account.",
  ENROLLMENT_CLOSED: "This package is already fully paid or no longer active.",
  NOTHING_DUE: "There's nothing left to pay on this package.",
  INVALID_MONTHS: "Please choose a valid number of months.",
};

export function friendlyDbError(message: string | undefined, fallback = "Something went wrong. Please try again.") {
  if (!message) return fallback;
  const code = Object.keys(FRIENDLY).find((k) => message.includes(k));
  return code ? FRIENDLY[code] : fallback;
}

/**
 * Create a pending payment for the next `months` unpaid months (plus the
 * registration fee if it hasn't been paid) and open a Paystack transaction.
 * The amount is computed by the database, never by the browser.
 */
export async function startPayment(input: { enrollmentId: string; userId: string; months: number }): Promise<StartPaymentResult> {
  const testMode = env.paystackTestMode && !env.paystackSecretKey;
  if (!testMode && !env.paystackSecretKey) {
    return { ok: false, error: "Online payments are not set up yet. Please contact us." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .rpc("prepare_payment", {
      p_enrollment_id: input.enrollmentId,
      p_user_id: input.userId,
      p_months: Math.max(1, Math.min(24, Math.floor(input.months))),
      p_provider: testMode ? "test" : "paystack",
    })
    .single<{ payment_id: string; reference: string; amount_kobo: number; email: string; includes_registration: boolean; months: number }>();

  if (error || !data) return { ok: false, error: friendlyDbError(error?.message) };

  const amountKobo = Number(data.amount_kobo);
  if (testMode) return { ok: true, mode: "test", reference: data.reference, amountKobo, email: data.email };

  try {
    const init = await initializeTransaction({
      email: data.email,
      amountKobo,
      reference: data.reference,
      callbackUrl: `${env.siteUrl}/payment/callback`,
      metadata: {
        enrollment_id: input.enrollmentId,
        user_id: input.userId,
        months: data.months,
        includes_registration: data.includes_registration,
        cancel_action: `${env.siteUrl}/dashboard`,
        custom_fields: [
          { display_name: "Months", variable_name: "months", value: String(data.months) },
          { display_name: "Includes registration", variable_name: "registration", value: data.includes_registration ? "Yes" : "No" },
        ],
      },
    });
    return {
      ok: true,
      mode: "paystack",
      reference: data.reference,
      amountKobo,
      accessCode: init.access_code,
      authorizationUrl: init.authorization_url,
      email: data.email,
    };
  } catch (err) {
    console.error("[paystack] initialize failed", err);
    await admin.rpc("mark_payment_unsuccessful", { p_reference: data.reference, p_status: "failed", p_gateway_response: "Initialization failed" });
    return { ok: false, error: "We couldn't reach Paystack just now. Please try again in a moment." };
  }
}

export type ConfirmResult =
  | { ok: true; status: "success"; result?: FinalizeResult; already?: boolean }
  | { ok: true; status: "pending" | "failed" | "abandoned" }
  | { ok: false; error: string };

/**
 * Check a payment with Paystack and, when it succeeded, record it.
 * Safe to call any number of times for the same reference.
 */
export async function confirmPayment(reference: string, opts: { userId?: string } = {}): Promise<ConfirmResult> {
  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("id, status, provider, user_id, expected_amount_kobo")
    .eq("reference", reference)
    .maybeSingle();

  if (!payment) return { ok: false, error: "Payment not found." };
  if (opts.userId && payment.user_id !== opts.userId) return { ok: false, error: "Payment not found." };
  if (payment.status === "success") return { ok: true, status: "success", already: true };

  let result: FinalizeResult | null = null;

  if (payment.provider === "test") {
    if (!env.paystackTestMode) return { ok: false, error: "Test payments are disabled." };
    const { data, error } = await admin.rpc("finalize_payment", {
      p_reference: reference,
      p_amount_kobo: payment.expected_amount_kobo,
      p_channel: "test",
      p_gateway_response: "Simulated payment (test mode)",
    });
    if (error) return { ok: false, error: friendlyDbError(error.message) };
    result = data as FinalizeResult;
  } else {
    let tx;
    try {
      tx = await verifyTransaction(reference);
    } catch (err) {
      console.error("[paystack] verify failed", err);
      return { ok: true, status: "pending" };
    }
    if (tx.status === "success") {
      if (tx.currency !== "NGN") console.warn(`[paystack] unexpected currency ${tx.currency} on ${reference}`);
      const { data, error } = await admin.rpc("finalize_payment", {
        p_reference: reference,
        p_amount_kobo: tx.amount,
        p_paid_at: tx.paid_at ?? new Date().toISOString(),
        p_channel: tx.channel,
        p_gateway_transaction_id: tx.id,
        p_fees_kobo: tx.fees,
        p_gateway_response: tx.gateway_response,
        p_raw: summarize(tx),
      });
      if (error) {
        console.error("[payments] finalize failed", error);
        return { ok: false, error: "We received your payment but couldn't record it yet. Our team has been alerted." };
      }
      result = data as FinalizeResult;
    } else if (tx.status === "failed" || tx.status === "abandoned" || tx.status === "reversed") {
      await admin.rpc("mark_payment_unsuccessful", {
        p_reference: reference,
        p_status: tx.status === "abandoned" ? "abandoned" : "failed",
        p_gateway_response: tx.gateway_response,
        p_raw: summarize(tx),
      });
      return { ok: true, status: tx.status === "abandoned" ? "abandoned" : "failed" };
    } else {
      return { ok: true, status: "pending" };
    }
  }

  if (result?.processed) {
    const r = result;
    after(async () => {
      await notifyPaymentResult(r);
      if (r.activated) await ensureDedicatedAccount(r.user_id).catch((e) => console.error("[dva]", e));
    });
  }
  return { ok: true, status: "success", result: result ?? undefined };
}
