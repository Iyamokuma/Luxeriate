"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Mail, Settings2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Switch } from "@/components/ui/checkbox";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { PERMISSIONS, PERMISSION_PRESETS, type Permission } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { inviteStaff, resendInvite, updateStaff } from "@/app/admin/actions/staff";

function PermissionPicker({ value, onChange }: { value: Permission[]; onChange: (v: Permission[]) => void }) {
  const groups = [...new Set(PERMISSIONS.map((p) => p.group))];
  const isPreset = (perms: Permission[]) => perms.length === value.length && perms.every((p) => value.includes(p));
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-semibold text-ink-800">Start from a role</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {PERMISSION_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onChange(p.permissions)}
              className={cn(
                "rounded-2xl border p-3 text-left transition",
                isPreset(p.permissions) ? "border-forest-600 bg-forest-50 ring-4 ring-forest-500/10" : "border-line-strong bg-white hover:border-ink-300",
              )}
            >
              <p className="text-sm font-semibold text-ink-900">{p.label}</p>
              <p className="mt-0.5 text-xs text-ink-500">{p.description}</p>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-ink-800">Fine-tune</p>
        <div className="grid gap-x-6 gap-y-4 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2">
          {groups.map((g) => (
            <div key={g}>
              <p className="eyebrow mb-2 text-ink-400">{g}</p>
              <div className="space-y-2">
                {PERMISSIONS.filter((p) => p.group === g).map((p) => (
                  <label key={p.key} className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-700">
                    <Checkbox
                      checked={value.includes(p.key)}
                      onCheckedChange={(c) => onChange(c ? [...value, p.key] : value.filter((x) => x !== p.key))}
                    />
                    {p.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function InviteStaffButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [perms, setPerms] = useState<Permission[]>(PERMISSION_PRESETS[0].permissions);
  const [pending, start] = useTransition();
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <UserPlus /> Invite staff
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Invite a staff member</DialogTitle>
            <DialogDescription>They&apos;ll get an email with a link to set their password.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Email">
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
            </div>
            <PermissionPicker value={perms} onChange={setPerms} />
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              onClick={() =>
                start(async () => {
                  const r = await inviteStaff({ full_name: name, email, permissions: perms });
                  if (!r.ok) toast.error(r.error);
                  else {
                    toast.success(`Invitation sent to ${email}`);
                    setOpen(false);
                    setName("");
                    setEmail("");
                  }
                })
              }
            >
              Send invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function EditStaffButton({ userId, name, permissions, isActive }: { userId: string; name: string; permissions: Permission[]; isActive: boolean }) {
  const [open, setOpen] = useState(false);
  const [perms, setPerms] = useState<Permission[]>(permissions);
  const [active, setActive] = useState(isActive);
  const [pending, start] = useTransition();
  const [resending, startResend] = useTransition();
  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          loading={resending}
          onClick={() =>
            startResend(async () => {
              const r = await resendInvite(userId);
              if (r.ok) toast.success("Sign-in link sent");
              else toast.error(r.error);
            })
          }
        >
          <Mail /> Send sign-in link
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
          <Settings2 /> Edit access
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>{name}&apos;s access</DialogTitle>
          </DialogHeader>
          <DialogBody className="space-y-5">
            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-line bg-white p-4">
              <span>
                <span className="block font-semibold text-ink-900">Account active</span>
                <span className="block text-sm text-ink-500">Turn off to block sign-in immediately. Their history is kept.</span>
              </span>
              <Switch checked={active} onCheckedChange={setActive} />
            </label>
            <PermissionPicker value={perms} onChange={setPerms} />
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={pending}
              onClick={() =>
                start(async () => {
                  const r = await updateStaff(userId, perms, active);
                  if (!r.ok) toast.error(r.error);
                  else {
                    toast.success("Access updated");
                    setOpen(false);
                  }
                })
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
