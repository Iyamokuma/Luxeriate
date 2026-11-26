"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, HandCoins, Minus, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/input";
import { STATES, lgasFor } from "@/lib/data/nigeria";
import { lagosToday, naira } from "@/lib/format";
import { cancelEnrollment, changeCollectionPoint, recordOfflinePayment, updateCustomer, type ActionResult } from "@/app/admin/actions/customers";

function useAction() {
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const run = (fn: () => Promise<ActionResult>, onOk?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setErrors({});
        toast.success(r.message ?? "Saved");
        onOk?.();
        router.refresh();
      } else {
        setErrors(r.fieldErrors ?? {});
        toast.error(r.error);
      }
    });
  return { pending, errors, run };
}

export function RecordPaymentButton({
  enrollmentId,
  monthlyKobo,
  remainingMonths,
  registrationKobo,
}: {
  enrollmentId: string;
  monthlyKobo: number;
  remainingMonths: number;
  registrationKobo: number;
}) {
  const [open, setOpen] = useState(false);
  const [months, setMonths] = useState(1);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(lagosToday());
  const { pending, errors, run } = useAction();
  const total = monthlyKobo * months + registrationKobo;
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} disabled={remainingMonths === 0 && !registrationKobo}>
        <HandCoins /> Record offline payment
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Record an offline payment</DialogTitle>
            <DialogDescription>
              Only for money received outside Paystack, such as cash at a hub. It is logged with your name and the customer gets a receipt.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <Field label="Months covered">
              <div className="flex items-center justify-between rounded-xl border border-line bg-white p-1.5">
                <Button variant="subtle" size="icon-sm" onClick={() => setMonths((m) => Math.max(1, m - 1))} disabled={months <= 1} aria-label="Fewer">
                  <Minus />
                </Button>
                <span className="tnum font-semibold text-ink-900">
                  {months} month{months === 1 ? "" : "s"}
                </span>
                <Button variant="subtle" size="icon-sm" onClick={() => setMonths((m) => Math.min(Math.max(remainingMonths, 1), m + 1))} disabled={months >= remainingMonths} aria-label="More">
                  <Plus />
                </Button>
              </div>
            </Field>
            <Field label="Date received" htmlFor="paid_at">
              <Input id="paid_at" type="date" value={date} max={lagosToday()} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Note" htmlFor="note" error={errors.note} hint="Who received it, where, and any reference.">
              <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Cash received by Bola at Lekki hub" />
            </Field>
            <div className="flex items-baseline justify-between rounded-xl bg-sand px-4 py-3 text-sm">
              <span className="text-ink-600">{registrationKobo > 0 ? "Registration + contributions" : "Amount"}</span>
              <span className="tnum font-display text-xl font-semibold text-ink-900">{naira(total)}</span>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={pending} onClick={() => run(() => recordOfflinePayment(enrollmentId, months, note, date + "T12:00:00+01:00"), () => setOpen(false))}>
              Record {naira(total)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CancelEnrollmentButton({ enrollmentId, name }: { enrollmentId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { pending, errors, run } = useAction();
  return (
    <>
      <Button variant="danger-ghost" size="sm" onClick={() => setOpen(true)}>
        <Ban /> Cancel enrollment
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Cancel {name}&apos;s enrollment?</DialogTitle>
            <DialogDescription>
              They will stop receiving reminders and won&apos;t be able to pay. Payments already made are kept on record. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label="Reason" htmlFor="reason" error={errors.reason}>
              <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Customer asked to leave early" />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Keep enrollment
            </Button>
            <Button variant="danger" loading={pending} onClick={() => run(() => cancelEnrollment(enrollmentId, reason), () => setOpen(false))}>
              Cancel enrollment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CollectionPointSelect({ enrollmentId, value, points }: { enrollmentId: string; value: string | null; points: { id: string; name: string }[] }) {
  const { pending, run } = useAction();
  return (
    <NativeSelect
      aria-label="Collection point"
      defaultValue={value ?? ""}
      disabled={pending}
      onChange={(e) => e.target.value && run(() => changeCollectionPoint(enrollmentId, e.target.value))}
      className="h-10 text-sm"
    >
      <option value="" disabled>
        Choose…
      </option>
      {points.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </NativeSelect>
  );
}

type Contact = {
  full_name: string;
  phone: string;
  whatsapp: string;
  address: string;
  state: string;
  lga: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
};

export function EditCustomerButton({ userId, initial }: { userId: string; initial: Contact }) {
  const [open, setOpen] = useState(false);
  const [v, setV] = useState(initial);
  const { pending, errors, run } = useAction();
  const set = (k: keyof Contact) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setV((p) => ({ ...p, [k]: e.target.value, ...(k === "state" ? { lga: "" } : {}) }));
  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Pencil /> Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Edit customer details</DialogTitle>
          </DialogHeader>
          <DialogBody className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" error={errors.full_name} className="sm:col-span-2">
              <Input value={v.full_name} onChange={set("full_name")} />
            </Field>
            <Field label="Phone" error={errors.phone}>
              <Input value={v.phone} onChange={set("phone")} />
            </Field>
            <Field label="WhatsApp" error={errors.whatsapp}>
              <Input value={v.whatsapp} onChange={set("whatsapp")} />
            </Field>
            <Field label="Address" error={errors.address} className="sm:col-span-2">
              <Input value={v.address} onChange={set("address")} />
            </Field>
            <Field label="State" error={errors.state}>
              <NativeSelect value={v.state} onChange={set("state")}>
                <option value="">Select state</option>
                {STATES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="LGA" error={errors.lga}>
              <NativeSelect value={v.lga} onChange={set("lga")}>
                <option value="">Select LGA</option>
                {lgasFor(v.state).map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Emergency contact" error={errors.emergency_contact_name}>
              <Input value={v.emergency_contact_name} onChange={set("emergency_contact_name")} />
            </Field>
            <Field label="Emergency phone" error={errors.emergency_contact_phone}>
              <Input value={v.emergency_contact_phone} onChange={set("emergency_contact_phone")} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={pending} onClick={() => run(() => updateCustomer(userId, v), () => setOpen(false))}>
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
