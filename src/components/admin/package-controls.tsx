"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/checkbox";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { duplicateCycle, setPackageOpen } from "@/app/admin/actions/packages";

export function OpenToggle({ id, open }: { id: string; open: boolean }) {
  const [value, setValue] = useState(open);
  const [pending, start] = useTransition();
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-ink-600">
      <Switch
        checked={value}
        disabled={pending}
        onCheckedChange={(v) => {
          setValue(v);
          start(async () => {
            const r = await setPackageOpen(id, v);
            if (!r.ok) {
              setValue(!v);
              toast.error(r.error);
            } else toast.success(v ? "Open for sign-up" : "Sign-ups closed");
          });
        }}
      />
      {value ? "Open for sign-up" : "Closed"}
    </label>
  );
}

export function DuplicateCycleButton({ fromYear }: { fromYear: number }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const to = fromYear + 1;
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Copy /> Copy to {to}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Start the {to} cycle</DialogTitle>
            <DialogDescription>
              Every {fromYear} package and its food items will be copied to {to}, closed for sign-up so you can adjust prices and items first.
              {` ${fromYear}`} records stay exactly as they are.
            </DialogDescription>
          </DialogHeader>
          <DialogBody />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              onClick={() =>
                start(async () => {
                  const r = await duplicateCycle(fromYear, to);
                  if (!r.ok) toast.error(r.error);
                  else {
                    toast.success(`Copied ${r.count} packages to ${to}`);
                    setOpen(false);
                    router.push(`/admin/packages?year=${to}`);
                  }
                })
              }
            >
              Copy packages
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
