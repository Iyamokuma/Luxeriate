"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FlaskConical, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { naira } from "@/lib/format";

export type CheckoutStart =
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

type Verify = { ok: boolean; status?: string; activated?: boolean; completed?: boolean; error?: string };

/**
 * Opens Paystack's popup checkout (card, transfer, USSD). After Paystack says
 * "success", the server re-verifies the transaction before anything is
 * marked as paid, then we land on the dashboard.
 */
export function useCheckout(opts: { onCancelHref?: string } = {}) {
  const router = useRouter();
  const [verifying, setVerifying] = useState(false);
  const [test, setTest] = useState<Extract<CheckoutStart, { ok: true }> | null>(null);

  const finish = useCallback(
    (reference: string, v: Verify) => {
      if (v.ok && v.status === "success") {
        const q = new URLSearchParams({ paid: reference });
        if (v.activated) q.set("welcome", "1");
        if (v.completed) q.set("completed", "1");
        router.push(`/dashboard?${q.toString()}`);
        router.refresh();
      } else if (v.ok && v.status === "pending") {
        toast.message("We're still confirming your payment", {
          description: "This usually takes a few seconds. Your dashboard will update automatically.",
        });
        router.push("/dashboard?payment=pending");
        router.refresh();
      } else {
        toast.error(v.error ?? "That payment didn't go through. You have not been charged twice; please try again.");
        router.refresh();
      }
    },
    [router],
  );

  const verify = useCallback(
    async (reference: string, endpoint = "/api/payments/verify") => {
      setVerifying(true);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        });
        finish(reference, (await res.json()) as Verify);
      } catch {
        finish(reference, { ok: true, status: "pending" });
      } finally {
        setVerifying(false);
      }
    },
    [finish],
  );

  const checkout = useCallback(
    async (start: CheckoutStart) => {
      if (!start.ok) {
        toast.error(start.error);
        return;
      }
      if (start.mode === "test") {
        setTest(start);
        return;
      }
      try {
        const PaystackPop = (await import("@paystack/inline-js")).default;
        const popup = new PaystackPop();
        popup.resumeTransaction(start.accessCode!, {
          onSuccess: (tx) => verify(tx.reference ?? start.reference),
          onCancel: () => {
            toast.message("Payment not completed", { description: "You can finish it any time from your dashboard." });
            if (opts.onCancelHref) {
              router.push(opts.onCancelHref);
              router.refresh();
            }
          },
          onError: () => {
            if (start.authorizationUrl) window.location.href = start.authorizationUrl;
          },
        });
      } catch {
        // Popup blocked or script failed to load: fall back to the full-page checkout
        if (start.authorizationUrl) window.location.href = start.authorizationUrl;
        else toast.error("We couldn't open the payment window. Please try again.");
      }
    },
    [verify, router, opts.onCancelHref],
  );

  const dialog = (
    <>
      <Dialog open={Boolean(test)} onOpenChange={(o) => !o && setTest(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-honey-100 px-2.5 py-1 text-xs font-semibold text-honey-700">
              <FlaskConical className="size-3.5" /> Test mode
            </span>
            <DialogTitle>Simulated checkout</DialogTitle>
            <DialogDescription>
              Paystack keys aren&apos;t configured, so this payment is simulated. No real money moves. This screen never
              appears in production.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="rounded-2xl bg-sand p-5 text-center">
              <p className="text-xs text-ink-500">{test?.email}</p>
              <p className="tnum mt-1 font-display text-3xl font-semibold text-ink-900">{naira(test?.amountKobo)}</p>
              <p className="mt-1 font-mono text-[0.6875rem] text-ink-400">{test?.reference}</p>
            </div>
            <Button
              size="lg"
              block
              loading={verifying}
              onClick={async () => {
                const ref = test!.reference;
                await verify(ref, "/api/payments/test-complete");
                setTest(null);
              }}
            >
              <Lock /> Simulate successful payment
            </Button>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {verifying && !test && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-paper/80 backdrop-blur-sm animate-fade-in">
          <div className="card flex flex-col items-center gap-4 px-10 py-9 text-center shadow-float">
            <span className="relative flex size-14 items-center justify-center rounded-full bg-forest-50 text-forest-700">
              <span className="absolute inset-0 animate-ping rounded-full bg-forest-200/60" />
              <ShieldCheck className="relative size-6" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-ink-900">Confirming with Paystack…</p>
              <p className="mt-1 text-sm text-ink-500">Please don&apos;t close this page.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return { checkout, verifying, dialog };
}
