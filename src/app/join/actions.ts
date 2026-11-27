"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { getSession, isStaff } from "@/lib/auth";
import { startPayment, type StartPaymentResult } from "@/lib/payments";
import { accountSchema, detailsSchema, fieldErrors, normalisePhone, termsSchema } from "@/lib/validation";

export async function checkReferral(code: string) {
  const c = code.trim().toUpperCase();
  if (c.length < 4) return { valid: false as const };
  const { data } = await createPublicClient().rpc("validate_referral_code", { p_code: c });
  const row = (data as { referrer_name: string; package_name: string }[] | null)?.[0];
  return row ? { valid: true as const, referrer: row.referrer_name, packageName: row.package_name } : { valid: false as const };
}

export type RegisterResult =
  | { ok: true; payment: StartPaymentResult }
  | { ok: false; error: string; fieldErrors?: Record<string, string>; step?: number; exists?: boolean };

const ENROLL_ERRORS: Record<string, { message: string; step?: number; field?: string }> = {
  PACKAGE_CLOSED: { message: "Registration for this package has closed." },
  PACKAGE_NOT_FOUND: { message: "We couldn't find that package." },
  COLLECTION_POINT_INVALID: { message: "Please choose a collection point.", step: 0, field: "collection_point_id" },
  REFERRAL_INVALID: { message: "That referral code isn't valid.", step: 0, field: "referral_code" },
};

export async function registerAndPay(input: {
  packageId: string;
  details: Record<string, unknown>;
  account?: { password: string; confirm_password: string };
  acceptTerms: boolean;
  months: number;
}): Promise<RegisterResult> {
  const session = await getSession("customer");

  const details = detailsSchema.safeParse(
    session ? { ...input.details, email: session.email } : input.details,
  );
  if (!details.success) return { ok: false, error: "Please check your details.", fieldErrors: fieldErrors(details.error), step: 0 };

  const terms = termsSchema.safeParse({ accept_terms: input.acceptTerms });
  if (!terms.success) return { ok: false, error: "Please accept the terms and conditions.", fieldErrors: fieldErrors(terms.error), step: 2 };

  if (session && isStaff(session.profile)) {
    return { ok: false, error: "Staff accounts can't join a package. Please use a separate customer account." };
  }

  const d = details.data;
  if (d.referral_code) {
    const ref = await checkReferral(d.referral_code);
    if (!ref.valid) return { ok: false, error: "That referral code isn't valid.", fieldErrors: { referral_code: "We couldn't find that code" }, step: 0 };
  }

  const admin = createAdminClient();
  let userId = session?.userId;
  let createdNow = false;

  if (!userId) {
    const account = accountSchema.safeParse(input.account ?? {});
    if (!account.success) return { ok: false, error: "Please choose a password.", fieldErrors: fieldErrors(account.error), step: 2 };

    const { data, error } = await admin.auth.admin.createUser({
      email: d.email,
      password: account.data.password,
      email_confirm: true,
      user_metadata: { full_name: d.full_name, phone: normalisePhone(d.phone) },
    });
    if (error || !data.user) {
      const exists = /already|registered|exists/i.test(error?.message ?? "");
      return exists
        ? { ok: false, exists: true, error: "An account with this email already exists. Log in to join this package.", step: 0, fieldErrors: { email: "This email already has an account" } }
        : { ok: false, error: "We couldn't create your account. Please try again." };
    }
    userId = data.user.id;
    createdNow = true;
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({
      full_name: d.full_name,
      phone: normalisePhone(d.phone),
      whatsapp: normalisePhone(d.whatsapp),
      address: d.address,
      state: d.state,
      lga: d.lga,
      emergency_contact_name: d.emergency_contact_name,
      emergency_contact_phone: normalisePhone(d.emergency_contact_phone),
    })
    .eq("id", userId);
  if (profileError) console.error("[join] profile update failed", profileError);

  let enrollmentId: string | null = null;
  const { data: created, error: enrollError } = await admin.rpc("create_enrollment", {
    p_user_id: userId,
    p_package_id: input.packageId,
    p_collection_point_id: d.collection_point_id,
    p_referral_code: d.referral_code ?? null,
  });

  if (enrollError) {
    if (enrollError.message.includes("ALREADY_ENROLLED")) {
      // Resume an unfinished registration instead of failing
      const { data: existing } = await admin
        .from("enrollments")
        .select("id, status")
        .eq("user_id", userId)
        .eq("package_id", input.packageId)
        .neq("status", "cancelled")
        .single();
      if (existing?.status !== "pending_payment") {
        return { ok: false, error: "You're already on this package. Visit your dashboard to make payments." };
      }
      enrollmentId = existing.id;
    } else {
      if (createdNow) await admin.auth.admin.deleteUser(userId!).catch(() => {});
      const known = Object.entries(ENROLL_ERRORS).find(([k]) => enrollError.message.includes(k))?.[1];
      return {
        ok: false,
        error: known?.message ?? "We couldn't complete your registration. Please try again.",
        step: known?.step,
        fieldErrors: known?.field ? { [known.field]: known.message } : undefined,
      };
    }
  } else {
    enrollmentId = created as string;
  }

  if (createdNow) {
    const supabase = await createClient("customer");
    await supabase.auth.signInWithPassword({ email: d.email, password: input.account!.password });
  }

  const payment = await startPayment({ enrollmentId: enrollmentId!, userId: userId!, months: input.months });
  return { ok: true, payment };
}
