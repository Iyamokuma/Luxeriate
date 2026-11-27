import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { CHANNEL_LABEL } from "@/lib/constants";
import { ReceiptDocument } from "@/lib/pdf/receipt";
import { fileResponse } from "@/lib/xlsx";
import type { PaymentOverview } from "@/types/db";

export async function GET(request: Request, ctx: RouteContext<"/api/receipts/[id]">) {
  const { id } = await ctx.params;
  // back-office links add ?team=1 and use the team session; everyone else the customer session
  const team = new URL(request.url).searchParams.get("team") === "1";
  const session = await getSession(team ? "team" : "customer");
  if (!session) {
    // Links in emails: sign in first, then come straight back to the receipt
    const login = new URL(team ? "/admin" : "/login", request.url);
    login.searchParams.set("next", `/api/receipts/${id}${team ? "?team=1" : ""}`);
    return Response.redirect(login, 303);
  }
  const db = session.supabase;

  // RLS: customers only see their own payments; staff with payments.view see all
  const { data: p } = await db.from("payment_overview").select("*").eq("id", id).eq("status", "success").maybeSingle<PaymentOverview>();
  if (!p || !p.receipt_number || !p.paid_at) return new Response("Receipt not found.", { status: 404 });

  const [{ data: lines }, { data: enrollment }, { data: settings }, { data: earlier }] = await Promise.all([
    db.from("payment_lines").select("line_type, amount_kobo, description, created_at").eq("payment_id", id).order("created_at"),
    db.from("enrollment_overview").select("total_kobo, duration_months").eq("id", p.enrollment_id).single(),
    db.from("app_settings").select("business_name, support_email, support_phone").eq("id", 1).single(),
    db
      .from("payment_overview")
      .select("contribution_kobo, months_covered, paid_at")
      .eq("enrollment_id", p.enrollment_id)
      .eq("status", "success")
      .lte("paid_at", p.paid_at),
  ]);

  const paidSoFar = (earlier ?? []).reduce((s, r) => s + Number(r.contribution_kobo), 0);
  const paidCount = (earlier ?? []).reduce((s, r) => s + Number(r.months_covered), 0);

  const order = { registration_fee: 0, contribution: 1, credit: 2 } as Record<string, number>;
  const sorted = [...(lines ?? [])].sort((a, b) => (order[a.line_type] ?? 9) - (order[b.line_type] ?? 9));

  const buffer = await renderToBuffer(
    ReceiptDocument({
      businessName: settings?.business_name ?? "Luxuriate Foodstuff",
      siteUrl: env.siteUrl,
      supportEmail: settings?.support_email,
      supportPhone: settings?.support_phone,
      receiptNumber: p.receipt_number,
      paidAt: p.paid_at,
      reference: p.reference,
      channel: CHANNEL_LABEL[p.channel ?? ""] ?? p.channel ?? "Paystack",
      customer: { name: p.full_name, email: p.email, phone: p.phone, code: p.customer_code },
      packageName: p.package_name,
      cycleYear: p.cycle_year,
      lines: sorted.map((l) => ({ description: l.description ?? l.line_type, amountKobo: Number(l.amount_kobo) })),
      totalKobo: Number(p.amount_kobo),
      paidSoFarKobo: paidSoFar,
      totalDueKobo: Number(enrollment?.total_kobo ?? 0),
      paidCount,
      duration: Number(enrollment?.duration_months ?? 12),
    }),
  );

  return fileResponse(buffer, `${p.receipt_number}.pdf`, "pdf");
}
