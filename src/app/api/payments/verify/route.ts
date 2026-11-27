import { getSession } from "@/lib/auth";
import { confirmPayment } from "@/lib/payments";

/** Called by the browser after the Paystack popup reports success. */
export async function POST(request: Request) {
  const session = await getSession("customer");
  if (!session) return Response.json({ ok: false, error: "Please sign in again." }, { status: 401 });
  const { reference } = (await request.json().catch(() => ({}))) as { reference?: string };
  if (!reference) return Response.json({ ok: false, error: "Missing reference." }, { status: 400 });

  // Paystack can take a moment to settle; retry briefly before reporting "pending"
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await confirmPayment(reference, { userId: session.userId });
    if (!r.ok) return Response.json(r, { status: 400 });
    if (r.status !== "pending") {
      return Response.json({
        ok: true,
        status: r.status,
        activated: r.status === "success" ? Boolean(r.result?.activated) : false,
        completed: r.status === "success" ? Boolean(r.result?.completed) : false,
      });
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  return Response.json({ ok: true, status: "pending" });
}
