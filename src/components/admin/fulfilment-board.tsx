"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { CalendarClock, MapPin, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/input";
import { FULFILMENT_LABEL, FULFILMENT_STEPS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { setFulfilment } from "@/app/admin/actions/operations";
import type { EnrollmentOverview } from "@/types/db";

const tone = { not_started: "neutral", preparing: "tide", ready: "forest", collection_scheduled: "clay", collected: "ink" } as const;
type Step = (typeof FULFILMENT_STEPS)[number]["key"];

export function FulfilmentBoard({ rows }: { rows: EnrollmentOverview[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<Step | null>(null);
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const groups = useMemo(() => {
    const m = new Map<string, { name: string; address: string | null; rows: EnrollmentOverview[] }>();
    for (const r of rows) {
      const key = r.collection_point_id ?? "none";
      const g = m.get(key) ?? { name: r.collection_point_name ?? "No collection point", address: r.collection_point_address, rows: [] };
      g.rows.push(r);
      m.set(key, g);
    }
    return [...m.entries()];
  }, [rows]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleGroup = (ids: string[], on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      ids.forEach((id) => (on ? n.add(id) : n.delete(id)));
      return n;
    });

  const apply = () =>
    start(async () => {
      if (!target) return;
      const r = await setFulfilment([...selected], target, target === "collection_scheduled" && when ? `${when}:00+01:00` : undefined, note);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`${r.count} package${r.count === 1 ? "" : "s"} moved to ${FULFILMENT_LABEL[target].toLowerCase()}`, {
        description: r.count ? "Customers are being emailed now." : "They were already at that step.",
      });
      setSelected(new Set());
      setTarget(null);
      setNote("");
      setWhen("");
    });

  return (
    <div className="space-y-5 pb-24">
      {groups.map(([key, g]) => {
        const ids = g.rows.map((r) => r.id);
        const all = ids.every((id) => selected.has(id));
        const some = ids.some((id) => selected.has(id));
        return (
          <Card key={key} className="overflow-hidden">
            <div className="flex items-center gap-3 border-b border-line bg-sand/50 px-5 py-3.5 sm:px-6">
              <Checkbox checked={all ? true : some ? "indeterminate" : false} onCheckedChange={(c) => toggleGroup(ids, c === true)} aria-label={`Select all at ${g.name}`} />
              <MapPin className="size-4 text-clay-500" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink-900">{g.name}</p>
                {g.address && <p className="truncate text-xs text-ink-500">{g.address}</p>}
              </div>
              <span className="text-sm text-ink-500">{g.rows.length} customers</span>
            </div>
            <ul className="divide-y divide-line">
              {g.rows.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-5 py-3 transition hover:bg-sand/40 sm:px-6">
                  <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} aria-label={`Select ${r.full_name}`} />
                  <Avatar name={r.full_name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/customers/${r.id}`} className="block truncate text-sm font-semibold text-ink-900 hover:underline">
                      {r.full_name}
                    </Link>
                    <p className="truncate text-xs text-ink-400">
                      {r.customer_code} · {r.package_name} · completed {formatDate(r.completed_at)}
                    </p>
                  </div>
                  {r.fulfilment_status === "collection_scheduled" && r.collection_scheduled_for && (
                    <span className="hidden items-center gap-1.5 text-xs text-ink-500 md:flex">
                      <CalendarClock className="size-3.5" /> {formatDateTime(r.collection_scheduled_for)}
                    </span>
                  )}
                  <Badge tone={tone[r.fulfilment_status]} size="sm" dot>
                    {r.fulfilment_status === "not_started" ? "To prepare" : FULFILMENT_LABEL[r.fulfilment_status]}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 lg:left-64">
          <div className="flex w-full max-w-3xl animate-scale-in flex-wrap items-center gap-2 rounded-2xl border border-forest-900 bg-forest-900 p-2 pl-4 text-cream shadow-float">
            <span className="text-sm font-semibold">{selected.size} selected</span>
            <button onClick={() => setSelected(new Set())} className="rounded-lg p-1 text-forest-100/70 hover:bg-white/10" aria-label="Clear selection">
              <X className="size-4" />
            </button>
            <span className="mx-1 hidden h-5 w-px bg-white/15 sm:block" />
            <span className="text-sm text-forest-100/70">Move to</span>
            <div className="flex flex-wrap gap-1.5">
              {FULFILMENT_STEPS.map((s) => (
                <Button key={s.key} size="sm" variant="outline-light" onClick={() => setTarget(s.key)}>
                  {s.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      <Dialog open={Boolean(target)} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Move {selected.size} package{selected.size === 1 ? "" : "s"} to {target ? FULFILMENT_LABEL[target].toLowerCase() : ""}</DialogTitle>
            <DialogDescription>Each customer gets an email letting them know.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {target === "collection_scheduled" && (
              <Field label="Collection date and time" htmlFor="when" hint="Lagos time">
                <Input id="when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
              </Field>
            )}
            <Field label="Note for customers" htmlFor="note" optional>
              <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Please bring a bag or two, and your customer ID." />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setTarget(null)}>
              Cancel
            </Button>
            <Button loading={pending} onClick={apply} disabled={target === "collection_scheduled" && !when}>
              Move and notify
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
