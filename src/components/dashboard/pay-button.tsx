"use client";

import { useState, useTransition } from "react";
import { Lock, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCheckout } from "@/components/payments/checkout";
import { naira } from "@/lib/format";
import { startPaymentAction } from "@/app/dashboard/actions";

export function PayButton({
  enrollmentId,
  monthlyKobo,
  remainingMonths,
  registrationKobo = 0,
  creditKobo = 0,
  defaultMonths = 1,
  nextMonths,
  label,
  size = "lg",
  variant = "primary",
  block,
  autoOpen,
}: {
  enrollmentId: string;
  monthlyKobo: number;
  remainingMonths: number;
  registrationKobo?: number;
  creditKobo?: number;
  defaultMonths?: number;
  nextMonths: string[];
  label?: string;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
  block?: boolean;
  autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(autoOpen));
  const [months, setMonths] = useState(Math.max(1, Math.min(defaultMonths, remainingMonths)));
  const [pending, startTransition] = useTransition();
  const { checkout, dialog } = useCheckout();
  const total = Math.max(100, monthlyKobo * months + registrationKobo - creditKobo);
  const covered = nextMonths.slice(0, months);

  const pay = () =>
    startTransition(async () => {
      const res = await startPaymentAction(enrollmentId, months);
      if (res.ok) setOpen(false);
      await checkout(res);
    });

  return (
    <>
      {dialog}
      <Button size={size} variant={variant} block={block} onClick={() => setOpen(true)}>
        <Lock /> {label ?? `Pay ${naira(total)}`}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>{registrationKobo ? "Activate your account" : "Make a payment"}</DialogTitle>
            <DialogDescription>
              {remainingMonths > 1 ? "Pay for the next month, or pay ahead for several at once." : "Pay your final month."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-5">
            {remainingMonths > 1 && (
              <div className="flex items-center justify-between rounded-2xl border border-line bg-white p-2">
                <Button variant="subtle" size="icon" onClick={() => setMonths((m) => Math.max(1, m - 1))} disabled={months <= 1} aria-label="Fewer months">
                  <Minus />
                </Button>
                <div className="text-center">
                  <p className="tnum font-display text-2xl font-semibold text-ink-900">{months}</p>
                  <p className="text-xs text-ink-500">month{months === 1 ? "" : "s"}</p>
                </div>
                <Button variant="subtle" size="icon" onClick={() => setMonths((m) => Math.min(remainingMonths, m + 1))} disabled={months >= remainingMonths} aria-label="More months">
                  <Plus />
                </Button>
              </div>
            )}
            <div className="space-y-2.5 rounded-2xl bg-sand/70 p-4 text-sm">
              {registrationKobo > 0 && (
                <div className="flex justify-between">
                  <span className="text-ink-500">Registration fee</span>
                  <span className="tnum font-semibold text-ink-900">{naira(registrationKobo)}</span>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <span className="text-ink-500">
                  {covered.length <= 2 ? covered.join(" & ") : `${covered[0]} – ${covered[covered.length - 1]}`}
                </span>
                <span className="tnum font-semibold text-ink-900">{naira(monthlyKobo * months)}</span>
              </div>
              {creditKobo > 0 && (
                <div className="flex justify-between">
                  <span className="text-ink-500">Credit on your account</span>
                  <span className="tnum font-semibold text-forest-700">−{naira(creditKobo)}</span>
                </div>
              )}
              <div className="h-px bg-line" />
              <div className="flex items-baseline justify-between">
                <span className="font-semibold text-ink-900">Total</span>
                <span className="tnum font-display text-2xl font-semibold text-ink-900">{naira(total)}</span>
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={pay} loading={pending}>
              <Lock /> Pay {naira(total)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
