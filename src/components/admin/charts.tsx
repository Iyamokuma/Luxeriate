"use client";

import { useMemo, useState } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { monthName, naira, nairaShort, number } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MonthlyCollection } from "@/types/db";
import { C } from "./monitor/colors";

// The dashboards' chart colours (validated on the white card surface)
export const SERIES = {
  contributions: C.contributions,
  fees: C.fees,
};

/** A clean axis step (1, 2 or 5 × a power of ten) giving about four gridlines. */
export function niceStep(raw: number) {
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

export function topRounded(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return "";
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

export function CollectionsChart({ data }: { data: MonthlyCollection[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const W = 720;
  const H = 240;
  const pad = { l: 52, r: 8, t: 12, b: 28 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  const rows = useMemo(
    () => data.map((d) => ({ ...d, c: Math.max(0, Number(d.contributions_kobo)), f: Math.max(0, Number(d.registration_fees_kobo)) })),
    [data],
  );
  const rawMax = Math.max(...rows.map((r) => r.c + r.f), 0) || 10_000_000; // ₦100k when empty
  const step = niceStep(rawMax / 4);
  const max = Math.ceil(rawMax / step) * step;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const slot = plotW / Math.max(rows.length, 1);
  const barW = Math.min(24, slot * 0.55);
  const y = (v: number) => pad.t + plotH - (v / max) * plotH;
  const total = rows.reduce((s, r) => s + r.c + r.f, 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4 text-xs font-medium text-ink-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px]" style={{ background: SERIES.contributions }} /> Contributions
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px]" style={{ background: SERIES.fees }} /> Registration fees
          </span>
        </div>
        <button
          onClick={() => setTable((t) => !t)}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-ink-500 transition hover:bg-sand hover:text-ink-800"
        >
          {table ? <BarChart3 className="size-3.5" /> : <Table2 className="size-3.5" />}
          {table ? "Chart" : "Table"}
        </button>
      </div>

      {table ? (
        <div className="max-h-[15rem] overflow-y-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-sand text-left text-xs text-ink-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Month</th>
                <th className="px-3 py-2 text-right font-semibold">Contributions</th>
                <th className="px-3 py-2 text-right font-semibold">Registration</th>
                <th className="px-3 py-2 text-right font-semibold">Payments</th>
              </tr>
            </thead>
            <tbody className="tnum">
              {rows.map((r) => (
                <tr key={r.month} className="border-t border-line">
                  <td className="px-3 py-2 text-ink-800">{monthName(r.month, "long")} {r.month.slice(0, 4)}</td>
                  <td className="px-3 py-2 text-right text-ink-800">{naira(r.c)}</td>
                  <td className="px-3 py-2 text-right text-ink-800">{naira(r.f)}</td>
                  <td className="px-3 py-2 text-right text-ink-500">{number(r.payments_count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Monthly collections, ${naira(total)} in total`} onMouseLeave={() => setHover(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e7ece7" strokeWidth={1} />
                <text x={pad.l - 10} y={y(t)} dy="0.32em" textAnchor="end" className="tnum fill-ink-400 text-[11px]">
                  {nairaShort(t)}
                </text>
              </g>
            ))}
            {rows.map((r, i) => {
              const cx = pad.l + slot * i + slot / 2;
              const x = cx - barW / 2;
              const hc = (r.c / max) * plotH;
              const hf = (r.f / max) * plotH;
              const gap = hc > 0 && hf > 0 ? 2 : 0;
              const dim = hover !== null && hover !== i;
              return (
                <g key={r.month} opacity={dim ? 0.45 : 1} className="transition-opacity">
                  {hc > 0 && (
                    <path
                      d={hf > 0 ? `M${x},${pad.t + plotH}V${pad.t + plotH - hc}H${x + barW}V${pad.t + plotH}Z` : topRounded(x, pad.t + plotH - hc, barW, hc, 4)}
                      fill={SERIES.contributions}
                    />
                  )}
                  {hf > 0 && <path d={topRounded(x, pad.t + plotH - hc - gap - hf, barW, hf, 4)} fill={SERIES.fees} />}
                  <text x={cx} y={H - 8} textAnchor="middle" className={cn("text-[11px]", hover === i ? "fill-ink-900 font-semibold" : "fill-ink-400")}>
                    {monthName(r.month)}
                  </text>
                  <rect x={pad.l + slot * i} y={pad.t} width={slot} height={plotH + 20} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${monthName(r.month, "long")}: ${naira(r.c + r.f)}`} />
                </g>
              );
            })}
          </svg>
          {hover !== null && rows[hover] && (
            <div
              className="pointer-events-none absolute top-2 z-10 w-52 -translate-x-1/2 rounded-xl border border-line bg-cream p-3 text-xs shadow-lift"
              style={{ left: `${((pad.l + slot * hover + slot / 2) / W) * 100}%` }}
            >
              <p className="font-semibold text-ink-900">
                {monthName(rows[hover].month, "long")} {rows[hover].month.slice(0, 4)}
              </p>
              <div className="mt-2 space-y-1.5">
                <TipRow color={SERIES.contributions} label="Contributions" value={naira(rows[hover].c)} />
                <TipRow color={SERIES.fees} label="Registration" value={naira(rows[hover].f)} />
                <div className="flex justify-between border-t border-line pt-1.5 text-ink-500">
                  <span>{number(rows[hover].payments_count)} payments</span>
                  <span className="tnum font-semibold text-ink-900">{naira(rows[hover].c + rows[hover].f)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-1.5 text-ink-600">
        <span className="size-2 rounded-[2px]" style={{ background: color }} />
        {label}
      </span>
      <span className="tnum font-semibold text-ink-900">{value}</span>
    </div>
  );
}

export function PackageBars({
  rows,
}: {
  rows: { id: string; name: string; customers: number; active: number; completed: number; collected_kobo: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.customers));
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.id} className="group relative grid grid-cols-[7.5rem_1fr] items-center gap-3 text-sm sm:grid-cols-[9rem_1fr]">
          <span className="truncate font-medium text-ink-700">{r.name}</span>
          <span className="flex items-center gap-2.5">
            <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100/60">
              <span
                className="absolute inset-y-0 left-0 rounded-r-[4px] transition-[width] duration-700"
                style={{ width: `${(r.customers / max) * 100}%`, background: SERIES.contributions }}
              />
            </span>
            <span className="tnum w-8 text-right font-semibold text-ink-900">{r.customers}</span>
          </span>
          <span className="pointer-events-none absolute right-10 top-1/2 z-10 hidden -translate-y-[120%] rounded-xl border border-line bg-cream px-3 py-2 text-xs shadow-lift group-hover:block">
            <span className="block font-semibold text-ink-900">{r.name}</span>
            <span className="tnum block text-ink-500">
              {r.active} active · {r.completed} completed · {naira(r.collected_kobo)} collected
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
