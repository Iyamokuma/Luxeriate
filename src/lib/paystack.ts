import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

const BASE = "https://api.paystack.co";

type PaystackEnvelope<T> = { status: boolean; message: string; data: T };

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!env.paystackSecretKey) throw new Error("PAYSTACK_SECRET_KEY is not set");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.paystackSecretKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as PaystackEnvelope<T> | null;
  if (!res.ok || !json?.status) {
    throw new Error(json?.message ?? `Paystack responded ${res.status}`);
  }
  return json.data;
}

export type PaystackTransaction = {
  id: number;
  status: "success" | "failed" | "abandoned" | "ongoing" | "pending" | "processing" | "queued" | "reversed";
  reference: string;
  amount: number;
  currency: string;
  channel: string;
  paid_at: string | null;
  fees: number | null;
  gateway_response: string | null;
  metadata: unknown;
  customer: { email: string; customer_code: string };
  authorization?: { channel?: string; card_type?: string; last4?: string; bank?: string; brand?: string };
};

export async function initializeTransaction(input: {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}) {
  return call<{ authorization_url: string; access_code: string; reference: string }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      channels: ["card", "bank", "bank_transfer", "ussd", "qr"],
      metadata: input.metadata,
    }),
  });
}

export async function verifyTransaction(reference: string) {
  return call<PaystackTransaction>(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Paystack signs every webhook with HMAC-SHA512 of the raw body. */
export function isValidSignature(rawBody: string, signature: string | null) {
  if (!signature || !env.paystackSecretKey) return false;
  const expected = createHmac("sha512", env.paystackSecretKey).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** A compact copy of the transaction for our records (no card tokens). */
export function summarize(tx: PaystackTransaction) {
  return {
    id: tx.id,
    status: tx.status,
    reference: tx.reference,
    amount: tx.amount,
    currency: tx.currency,
    channel: tx.channel,
    paid_at: tx.paid_at,
    fees: tx.fees,
    gateway_response: tx.gateway_response,
    customer: { email: tx.customer?.email, customer_code: tx.customer?.customer_code },
    authorization: tx.authorization
      ? {
          channel: tx.authorization.channel,
          card_type: tx.authorization.card_type,
          last4: tx.authorization.last4,
          bank: tx.authorization.bank,
          brand: tx.authorization.brand,
        }
      : undefined,
  };
}

// ─── Dedicated virtual accounts (optional) ───────────────────────────────
export async function createCustomer(input: { email: string; first_name: string; last_name: string; phone?: string | null }) {
  return call<{ customer_code: string; id: number }>("/customer", {
    method: "POST",
    body: JSON.stringify({ ...input, phone: input.phone ?? undefined }),
  });
}

export async function assignDedicatedAccount(customerCode: string, preferredBank: string) {
  return call<{
    account_number: string;
    account_name: string;
    bank: { name: string; slug: string };
  }>("/dedicated_account", {
    method: "POST",
    body: JSON.stringify({ customer: customerCode, preferred_bank: preferredBank }),
  });
}
