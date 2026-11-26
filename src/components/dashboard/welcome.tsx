"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArcsMotif } from "@/components/ui/logo";

/** Celebrates activation / completion and confirms payments after checkout. */
export function PaymentFeedback({ customerCode, referralCode, packageName }: { customerCode?: string | null; referralCode?: string | null; packageName?: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const welcome = params.get("welcome") === "1";
  const completed = params.get("completed") === "1";
  const paid = params.get("paid");
  const pendingPayment = params.get("payment");
  const [open, setOpen] = useState(welcome || completed);

  useEffect(() => {
    if (paid && !welcome && !completed) toast.success("Payment received. Thank you!", { description: "Your receipt is on its way to your email." });
    if (pendingPayment === "failed" || pendingPayment === "abandoned") toast.error("That payment didn't go through.", { description: "You haven't been charged. Please try again." });
    if (pendingPayment === "error") toast.error("We couldn't confirm that payment yet.", { description: "If you were charged, it will appear shortly." });
    if (params.get("password") === "updated") toast.success("Your password has been updated.");
    if (paid || pendingPayment === "failed" || pendingPayment === "abandoned" || pendingPayment === "error" || params.get("password")) {
      const next = new URLSearchParams(params);
      ["paid", "payment", "password"].forEach((k) => next.delete(k));
      if (!welcome && !completed) router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
    }
    // run once on arrival
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep refreshing briefly while a payment is being confirmed
  useEffect(() => {
    if (pendingPayment !== "pending") return;
    let n = 0;
    const t = setInterval(() => {
      n++;
      router.refresh();
      if (n >= 8) clearInterval(t);
    }, 4000);
    return () => clearInterval(t);
  }, [pendingPayment, router]);

  const close = () => {
    setOpen(false);
    router.replace(pathname, { scroll: false });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent size="sm" className="overflow-hidden">
        <div className="relative bg-forest-800 px-6 pb-10 pt-12 text-center text-cream">
          <ArcsMotif className="absolute left-1/2 top-1/2 h-64 -translate-x-1/2 -translate-y-1/2 text-honey-300/25" />
          <span className="relative mx-auto flex size-16 animate-scale-in items-center justify-center rounded-full bg-honey-300 text-forest-900 shadow-lift">
            <Check className="size-8" strokeWidth={3} />
          </span>
          <DialogTitle className="relative mt-6 text-3xl text-cream">{completed ? "Every month is paid!" : "Welcome to Luxuriate"}</DialogTitle>
          <DialogDescription className="relative mt-2 text-forest-100/80">
            {completed
              ? "Congratulations. We'll let you know as your package is prepared."
              : `Your ${packageName ?? ""} package is active. A confirmation is on its way to your email.`}
          </DialogDescription>
        </div>
        <div className="space-y-3 p-6">
          {customerCode && (
            <div className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3">
              <div>
                <p className="text-xs text-ink-400">Your customer ID</p>
                <p className="font-mono text-base font-semibold tracking-wide text-ink-900">{customerCode}</p>
              </div>
              <CopyButton value={customerCode} iconOnly variant="ghost" label="Copy customer ID" />
            </div>
          )}
          {referralCode && !completed && (
            <div className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3">
              <div>
                <p className="text-xs text-ink-400">Your referral code</p>
                <p className="font-mono text-base font-semibold tracking-wide text-ink-900">{referralCode}</p>
              </div>
              <CopyButton value={referralCode} iconOnly variant="ghost" label="Copy referral code" />
            </div>
          )}
          <Button block size="lg" onClick={close}>
            Go to my dashboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
