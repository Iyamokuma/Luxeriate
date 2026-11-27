import { getSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { confirmPayment } from "@/lib/payments";

/** Simulated checkout for local development (PAYSTACK_TEST_MODE=true, never in production). */
export async function POST(request: Request) {
  if (!env.paystackTestMode) return new Response("Not found", { status: 404 });
  const session = await getSession("customer");
  if (!session) return Response.json({ ok: false, error: "Please sign in again." }, { status: 401 });
  const { reference } = (await request.json().catch(() => ({}))) as { reference?: string };
  if (!reference) return Response.json({ ok: false, error: "Missing reference." }, { status: 400 });
  const r = await confirmPayment(reference, { userId: session.userId });
  if (!r.ok) return Response.json(r, { status: 400 });
  return Response.json({
    ok: true,
    status: r.status,
    activated: r.status === "success" ? Boolean(r.result?.activated) : false,
    completed: r.status === "success" ? Boolean(r.result?.completed) : false,
  });
}
