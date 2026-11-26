"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Input, NativeSelect } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

function useSetParam() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const set = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    if (!("page" in updates)) next.delete("page");
    start(() => router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false }));
  };
  return { set, params, pending };
}

export function SearchBox({ placeholder = "Search…", param = "q", className }: { placeholder?: string; param?: string; className?: string }) {
  const { set, params, pending } = useSetParam();
  const [value, setValue] = useState(params.get(param) ?? "");
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => set({ [param]: value.trim() || null }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <div className={cn("w-full sm:w-80", className)}>
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        prefix={pending ? <Spinner className="size-4" /> : <Search className="size-4" />}
        suffix={
          value ? (
            <button type="button" onClick={() => setValue("")} className="flex size-7 items-center justify-center rounded-lg text-ink-400 hover:bg-sand" aria-label="Clear search">
              <X className="size-3.5" />
            </button>
          ) : null
        }
        className="h-10 [&::-webkit-search-cancel-button]:hidden"
      />
    </div>
  );
}

export function SelectFilter({
  param,
  options,
  label,
  className,
}: {
  param: string;
  options: { value: string; label: string }[];
  label: string;
  className?: string;
}) {
  const { set, params } = useSetParam();
  return (
    <div className={cn("w-full sm:w-auto", className)}>
      <NativeSelect aria-label={label} value={params.get(param) ?? ""} onChange={(e) => set({ [param]: e.target.value || null })} className="h-10 min-w-40 text-sm">
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

export function SegmentFilter({ param, options, className }: { param: string; options: { value: string; label: string; count?: number }[]; className?: string }) {
  const { set, params } = useSetParam();
  const current = params.get(param) ?? "";
  return (
    <div className={cn("scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => set({ [param]: o.value || null })}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition",
            current === o.value ? "border-forest-700 bg-forest-700 text-cream" : "border-line-strong bg-cream text-ink-600 hover:text-ink-900",
          )}
        >
          {o.label}
          {o.count !== undefined && (
            <span className={cn("rounded-full px-1.5 text-xs", current === o.value ? "bg-white/15" : "bg-sand text-ink-500")}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function YearSwitcher({ years, year, dark }: { years: number[]; year: number; dark?: boolean }) {
  const { set } = useSetParam();
  if (years.length <= 1)
    return (
      <span
        className={cn(
          "rounded-full px-3 py-1.5 text-sm font-semibold",
          dark ? "bg-white/[0.07] text-ink-200 ring-1 ring-inset ring-white/10" : "bg-sand text-ink-700",
        )}
      >
        {year} cycle
      </span>
    );
  return (
    <NativeSelect
      aria-label="Cycle year"
      value={String(year)}
      onChange={(e) => set({ year: e.target.value })}
      className={cn("h-9 rounded-full text-sm font-semibold", dark && "h-8 border-white/10 bg-white/[0.07] pl-3 text-[0.8125rem] text-ink-100 [&>option]:text-ink-900")}
    >
      {years.map((y) => (
        <option key={y} value={y}>
          {y} cycle
        </option>
      ))}
    </NativeSelect>
  );
}

export function Pagination({ page, pageSize, total }: { page: number; pageSize: number; total: number }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const href = (p: number) => {
    const next = new URLSearchParams(params);
    if (p <= 1) next.delete("page");
    else next.set("page", String(p));
    return next.size ? `${pathname}?${next}` : pathname;
  };
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-3.5 text-sm text-ink-500 sm:px-6">
      <p>
        <span className="font-semibold text-ink-800">{from.toLocaleString()}–{to.toLocaleString()}</span> of {total.toLocaleString()}
      </p>
      <div className="flex items-center gap-1">
        <PageLink href={href(page - 1)} disabled={page <= 1} label="Previous page">
          <ChevronLeft className="size-4" />
        </PageLink>
        <span className="px-2 font-medium text-ink-700">
          {page} / {pages}
        </span>
        <PageLink href={href(page + 1)} disabled={page >= pages} label="Next page">
          <ChevronRight className="size-4" />
        </PageLink>
      </div>
    </div>
  );
}

function PageLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  if (disabled)
    return (
      <span className="flex size-8 items-center justify-center rounded-lg text-ink-300" aria-disabled>
        {children}
      </span>
    );
  return (
    <Link href={href} scroll={false} className="flex size-8 items-center justify-center rounded-lg text-ink-600 hover:bg-sand" aria-label={label}>
      {children}
    </Link>
  );
}
