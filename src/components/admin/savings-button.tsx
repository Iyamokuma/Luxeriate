"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { lagosToday, naira } from "@/lib/format";
import { markSavingsPaid } from "@/app/admin/actions/operations";

export function MarkSavingsPaidButton({ enrollmentId, name, amountKobo }: { enrollmentId: string; name: string; amountKobo: number }) {
  const [open, setOpen] = useState(false);
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(lagosToday());
  const [pending, start] = useTransition();
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Check /> Mark paid
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Mark {naira(amountKobo)} as paid</DialogTitle>
            <DialogDescription>Confirm you have sent {name}&apos;s savings return. They&apos;ll get an email.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <Field label="Transfer reference" htmlFor="ref" optional>
              <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. bank transfer session ID" />
            </Field>
            <Field label="Date sent" htmlFor="date">
              <Input id="date" type="date" max={lagosToday()} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              onClick={() =>
                start(async () => {
                  const r = await markSavingsPaid(enrollmentId, reference, `${date}T12:00:00+01:00`);
                  if (!r.ok) toast.error(r.error);
                  else {
                    toast.success("Savings return marked as paid");
                    setOpen(false);
                  }
                })
              }
            >
              Confirm paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
