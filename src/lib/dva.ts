import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { assignDedicatedAccount, createCustomer } from "@/lib/paystack";

/**
 * Optional: give a customer their own bank account number (Paystack
 * Dedicated Virtual Account). Transfers into it arrive by webhook and are
 * matched to the customer automatically.
 */
export async function ensureDedicatedAccount(userId: string) {
  if (!env.dvaEnabled || !env.paystackSecretKey) return;
  const admin = createAdminClient();
  const { data: p } = await admin
    .from("profiles")
    .select("id, email, full_name, phone, paystack_customer_code, dva_account_number")
    .eq("id", userId)
    .single();
  if (!p || p.dva_account_number) return;

  let code = p.paystack_customer_code as string | null;
  if (!code) {
    const [first, ...rest] = String(p.full_name).trim().split(/\s+/);
    const customer = await createCustomer({ email: p.email, first_name: first ?? "", last_name: rest.join(" ") || first || "", phone: p.phone });
    code = customer.customer_code;
    await admin.from("profiles").update({ paystack_customer_code: code }).eq("id", userId);
  }
  const account = await assignDedicatedAccount(code, env.dvaPreferredBank);
  await admin
    .from("profiles")
    .update({ dva_account_number: account.account_number, dva_account_name: account.account_name, dva_bank_name: account.bank?.name })
    .eq("id", userId);
}
