import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { confirmPayment } from "@/lib/payments";
import { isValidSignature, summarize, verifyTransaction } from "@/lib/paystack";
import { notifyPaymentResult } from "@/lib/email/notify";
import { recordSystemEvent } from "@/lib/system-events";
import type { FinalizeResult } from "@/types/db";

/**
 * Paystack webhook. Configure in Paystack → Settings → API Keys & Webhooks:
 *   https://YOUR-DOMAIN/api/paystack/webhook
 * Every event is signature-checked, and every charge is re-verified with the
 * Paystack API before anything is credited.
 */
export async function POST(request: Request) {
  const startedAt = performance.now();
  const raw = await request.text();
  if (!isValidSignature(raw, request.headers.get("x-paystack-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: { event: string; data: Record<string, unknown> };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad payload", { status: 400 });
  }

  try {
    if (event.event === "charge.success") {
      await handleChargeSuccess(event.data);
    } else if (event.event === "dedicatedaccount.assign.success") {
      await handleDedicatedAccountAssigned(event.data);
    }
  } catch (err) {
    console.error(`[webhook] ${event.event} failed`, err);
    const message = err instanceof Error ? err.message : String(err);
    const durationMs = performance.now() - startedAt;
    after(() => recordSystemEvent("paystack.webhook", "error", `${event.event} failed: ${message}`, { durationMs, details: { event: event.event, reference: event.data?.reference ?? null } }));
    // A non-2xx makes Paystack retry later
    return new Response("Processing error", { status: 500 });
  }

  const durationMs = performance.now() - startedAt;
  after(() => recordSystemEvent("paystack.webhook", "ok", event.event, { durationMs, details: { reference: event.data?.reference ?? null } }));
  return Response.json({ received: true });
}

async function handleChargeSuccess(data: Record<string, unknown>) {
  const reference = String(data.reference ?? "");
  if (!reference) return;
  const admin = createAdminClient();

  const { data: existing } = await admin.from("payments").select("id").eq("reference", reference).maybeSingle();
  if (existing) {
    const r = await confirmPayment(reference);
    if (!r.ok) throw new Error(r.error);
    return;
  }

  // A transfer into a customer's dedicated account (no reference from us)
  const customerCode = (data.customer as { customer_code?: string } | undefined)?.customer_code;
  if (!customerCode) return;

  const tx = await verifyTransaction(reference);
  if (tx.status !== "success") return;

  const { data: profile } = await admin.from("profiles").select("id").eq("paystack_customer_code", customerCode).maybeSingle();
  if (!profile) {
    console.warn(`[webhook] no customer for Paystack customer ${customerCode} (ref ${reference})`);
    return;
  }

  const { data: result, error } = await admin.rpc("record_external_payment", {
    p_user_id: profile.id,
    p_reference: reference,
    p_amount_kobo: tx.amount,
    p_provider: "paystack_dva",
    p_paid_at: tx.paid_at ?? new Date().toISOString(),
    p_channel: tx.channel,
    p_gateway_transaction_id: tx.id,
    p_fees_kobo: tx.fees,
    p_raw: summarize(tx),
  });
  if (error) throw error;
  const r = result as FinalizeResult;
  if (r.processed) after(() => notifyPaymentResult(r));
}

async function handleDedicatedAccountAssigned(data: Record<string, unknown>) {
  const customer = data.customer as { customer_code?: string } | undefined;
  const account = data.dedicated_account as
    | { account_number?: string; account_name?: string; bank?: { name?: string } }
    | undefined;
  if (!customer?.customer_code || !account?.account_number) return;
  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({
      dva_account_number: account.account_number,
      dva_account_name: account.account_name ?? null,
      dva_bank_name: account.bank?.name ?? null,
    })
    .eq("paystack_customer_code", customer.customer_code);
}
