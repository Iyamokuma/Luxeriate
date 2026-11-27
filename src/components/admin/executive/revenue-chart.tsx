"use client";

import { useMemo, useState } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { niceStep, topRounded } from "@/components/admin/charts";
import { Legend, TipRow, Tooltip, useWidth } from "@/components/admin/monitor/charts";
import { C } from "@/components/admin/monitor/colors";
import { formatMonth, monthName, naira, nairaShort, number } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { MonthlyCollection } from "@/types/db";

/** Twelve months of money received, split into contributions and registration fees. */
export function RevenueChart({ data, today }: { data: MonthlyCollection[]; today: string }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const rows = useMemo(
    () =>
      data.map((d) => ({
        m: d.month,
        c: Math.max(0, Number(d.contributions_kobo) + Number(d.credit_kobo)),
        f: Math.max(0, Number(d.registration_fees_kobo)),
        n: Number(d.payments_count),
      })),
    [data],
  );
  const H = 268;
  const pad = { l: 54, r: 4, t: 22, b: 30 };
  const plotW = Math.max(0, w - pad.l - pad.r);
  const plotH = H - pad.t - pad.b;
  const total = rows.reduce((s, r) => s + r.c + r.f, 0);
  const fees = rows.reduce((s, r) => s + r.f, 0);
  const rawMax = Math.max(...rows.map((r) => r.c + r.f), 0) || 10_000_000;
  const step = niceStep(rawMax / 4);
  const max = Math.ceil(rawMax / step) * step;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const slot = plotW / Math.max(rows.length, 1);
  const barW = Math.max(6, Math.min(34, slot * 0.56));
  const y = (v: number) => pad.t + plotH - (v / max) * plotH;
  const base = pad.t + plotH;
  const thisMonth = today.slice(0, 7);
  const best = rows.reduce((b, r, i) => (r.c + r.f > (rows[b]?.c ?? 0) + (rows[b]?.f ?? 0) ? i : b), 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-baseline gap-6">
          <div>
            <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ink-400">Received · 12 months</p>
            <p className="tnum mt-1 font-mono text-[1.375rem] font-medium tracking-[-0.02em] text-ink-900">{naira(total)}</p>
          </div>
          <div className="hidden sm:block">
            <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ink-400">Registration income</p>
            <p className="tnum mt-1 font-mono text-[1.375rem] font-medium tracking-[-0.02em] text-ink-500">{naira(fees)}</p>
          </div>
        </div>
        <button
          onClick={() => setTable((t) => !t)}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-ink-500 transition hover:bg-sand hover:text-ink-800"
        >
          {table ? <BarChart3 className="size-3.5" /> : <Table2 className="size-3.5" />}
          {table ? "Chart" : "Table"}
        </button>
      </div>

      {table ? (
        <div className="max-h-[17rem] overflow-y-auto rounded-xl border border-line">
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
              {[...rows].reverse().map((r) => (
                <tr key={r.m} className="border-t border-line">
                  <td className="px-3 py-2 text-ink-800">{formatMonth(r.m)}</td>
                  <td className="px-3 py-2 text-right text-ink-800">{naira(r.c)}</td>
                  <td className="px-3 py-2 text-right text-ink-800">{naira(r.f)}</td>
                  <td className="px-3 py-2 text-right text-ink-500">{number(r.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div ref={ref} className="relative" style={{ height: H }}>
            {w > 0 && (
              <svg width={w} height={H} role="img" aria-label={`Money received each month for the last 12 months, ${naira(total)} in all`} className="block" onPointerLeave={() => setHover(null)}>
                {ticks.map((t) => (
                  <g key={t}>
                    <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke={C.grid} />
                    <text x={pad.l - 10} y={y(t)} dy="0.32em" textAnchor="end" className="tnum fill-ink-400 text-[11px]">
                      {nairaShort(t)}
                    </text>
                  </g>
                ))}
                {rows.map((r, i) => {
                  const cx = pad.l + slot * i + slot / 2;
                  const bx = cx - barW / 2;
                  const hc = (r.c / max) * plotH;
                  const hf = (r.f / max) * plotH;
                  const gap = hc > 0 && hf > 0 ? 2 : 0;
                  const current = r.m.slice(0, 7) === thisMonth;
                  const label = i === best || current || hover === i;
                  return (
                    <g key={r.m} opacity={hover !== null && hover !== i ? 0.42 : 1} className="transition-opacity duration-150">
                      {hc > 0 && <path d={hf > 0 ? `M${bx},${base}V${base - hc}H${bx + barW}V${base}Z` : topRounded(bx, base - hc, barW, hc, 4)} fill={C.contributions} />}
                      {hf > 0 && <path d={topRounded(bx, base - hc - gap - hf, barW, hf, 4)} fill={C.fees} />}
                      {r.c + r.f === 0 && <rect x={bx} y={base - 3} width={barW} height={3} rx={1.5} fill={C.grid} />}
                      {label && r.c + r.f > 0 && (
                        <text x={cx} y={base - hc - hf - gap - 7} textAnchor="middle" className="tnum fill-ink-600 font-mono text-[10.5px]">
                          {nairaShort(r.c + r.f)}
                        </text>
                      )}
                      <text x={cx} y={H - 9} textAnchor="middle" className={cn("text-[11px]", current ? "fill-ink-900 font-semibold" : "fill-ink-400")}>
                        {slot < 30 ? monthName(r.m).slice(0, 1) : monthName(r.m)}
                      </text>
                      <rect x={pad.l + slot * i} y={0} width={slot} height={H} fill="transparent" onPointerEnter={() => setHover(i)} />
                    </g>
                  );
                })}
                <line x1={pad.l} x2={w - pad.r} y1={base} y2={base} stroke={C.axis} />
              </svg>
            )}
            {hover !== null && rows[hover] && (
              <Tooltip x={pad.l + slot * hover + slot / 2} width={w}>
                <p className="font-semibold text-ink-900">{formatMonth(rows[hover].m)}</p>
                <div className="mt-2 space-y-1.5">
                  <TipRow color={C.contributions} label="Contributions" value={naira(rows[hover].c)} />
                  <TipRow color={C.fees} label="Registration" value={naira(rows[hover].f)} />
                  <div className="flex justify-between border-t border-line pt-1.5">
                    <span>{number(rows[hover].n)} payments</span>
                    <span className="tnum font-semibold text-ink-900">{naira(rows[hover].c + rows[hover].f)}</span>
                  </div>
                </div>
              </Tooltip>
            )}
          </div>
          <div className="mt-3">
            <Legend
              items={[
                { color: C.contributions, label: "Contributions" },
                { color: C.fees, label: "Registration fees" },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}
