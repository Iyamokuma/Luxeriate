import { NextResponse, type NextRequest } from "next/server";
import { confirmPayment } from "@/lib/payments";

/** Paystack redirects here when the customer used the full-page checkout. */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference") ?? request.nextUrl.searchParams.get("trxref");
  const dest = new URL("/dashboard", request.url);
  if (!reference) return NextResponse.redirect(dest);
  const r = await confirmPayment(reference);
  if (r.ok && r.status === "success") {
    dest.searchParams.set("paid", reference);
    if (r.result?.activated) dest.searchParams.set("welcome", "1");
  } else if (r.ok) {
    dest.searchParams.set("payment", r.status);
  } else {
    dest.searchParams.set("payment", "error");
  }
  return NextResponse.redirect(dest);
}
