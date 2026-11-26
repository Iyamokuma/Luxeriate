"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog as D } from "radix-ui";
import { CornerDownLeft, Search } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { searchCustomers } from "@/app/admin/actions/search";
import { cn } from "@/lib/utils";

type Hit = { id: string; full_name: string; customer_code: string | null; phone: string | null; package_name: string; status: string };

export function CommandSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const [pending, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHits([]);
      return;
    }
    const t = setTimeout(() => start(async () => {
      setHits(await searchCustomers(q));
      setActive(0);
    }), 200);
    return () => clearTimeout(t);
  }, [q]);

  const go = (h: Hit) => {
    setOpen(false);
    setQ("");
    router.push(`/admin/customers/${h.id}`);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-10 w-full max-w-md items-center gap-2.5 rounded-xl border border-line bg-cream px-3.5 text-sm text-ink-400 shadow-soft transition hover:border-line-strong"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Find a customer by name, phone or ID</span>
        <kbd className="hidden rounded-md border border-line bg-sand px-1.5 py-0.5 font-sans text-[0.6875rem] font-semibold text-ink-500 sm:block">⌘K</kbd>
      </button>
      <D.Root open={open} onOpenChange={setOpen}>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-50 bg-ink-950/40 backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
          <D.Content className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-cream shadow-float data-[state=open]:animate-scale-in">
            <D.Title className="sr-only">Search customers</D.Title>
            <div className="flex items-center gap-3 border-b border-line px-4">
              {pending ? <Spinner className="text-ink-400" /> : <Search className="size-4 text-ink-400" />}
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActive((a) => Math.min(hits.length - 1, a + 1));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActive((a) => Math.max(0, a - 1));
                  } else if (e.key === "Enter" && hits[active]) go(hits[active]);
                }}
                placeholder="Name, phone, email or LUX-2027-…"
                className="h-14 flex-1 bg-transparent text-[0.9375rem] text-ink-900 outline-none placeholder:text-ink-300"
              />
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {q.trim().length < 2 ? (
                <p className="px-3 py-8 text-center text-sm text-ink-400">Type at least two characters.</p>
              ) : hits.length === 0 && !pending ? (
                <p className="px-3 py-8 text-center text-sm text-ink-400">No customers match &ldquo;{q}&rdquo;.</p>
              ) : (
                <ul>
                  {hits.map((h, i) => (
                    <li key={h.id}>
                      <button
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(h)}
                        className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition", i === active ? "bg-sand" : "")}
                      >
                        <Avatar name={h.full_name} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink-900">{h.full_name}</span>
                          <span className="block truncate text-xs text-ink-400">
                            {h.customer_code ?? "Awaiting payment"} · {h.package_name} · {h.phone}
                          </span>
                        </span>
                        {i === active && <CornerDownLeft className="size-3.5 text-ink-400" />}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </D.Content>
        </D.Portal>
      </D.Root>
    </>
  );
}
