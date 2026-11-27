"use client";

import { useState } from "react";
import { LineChart, Table2 } from "lucide-react";
import { niceStep } from "@/components/admin/charts";
import { Legend, TipRow, Tooltip, monotonePath, useWidth } from "@/components/admin/monitor/charts";
import { C } from "@/components/admin/monitor/colors";
import type { JourneyPoint } from "@/lib/customer-insights";
import { formatDate, formatMonth, monthName, naira, nairaShort } from "@/lib/format";
import { cn } from "@/lib/utils";

const PLAN = "#85918a";

/**
 * Money saved against the plan, month by month: the dashed line is what the
 * schedule expects by each due date, the green line what had actually been
 * paid by then (and today, for the month in progress).
 */
export function JourneyChart({ points }: { points: JourneyPoint[] }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const H = 236;
  const pad = { l: 52, r: 10, t: 16, b: 28 };
  const plotW = Math.max(0, w - pad.l - pad.r);
  const plotH = H - pad.t - pad.b;
  const top = Math.max(...points.map((p) => Math.max(p.plan, p.saved ?? 0)), 1);
  const step = niceStep(top / 4);
  const max = Math.ceil(top / step) * step;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const slot = plotW / Math.max(points.length, 1);
  const x = (i: number) => pad.l + slot * i + slot / 2;
  const y = (v: number) => pad.t + plotH - (v / max) * plotH;
  const base = pad.t + plotH;
  const planPts: [number, number][] = points.map((p, i) => [x(i), y(p.plan)]);
  const savedIdx = points.map((p, i) => (p.saved === null ? -1 : i)).filter((i) => i >= 0);
  const savedPts: [number, number][] = savedIdx.map((i) => [x(i), y(points[i].saved!)]);
  const savedLine = w && savedPts.length ? monotonePath(savedPts) : "";
  const savedArea = savedLine ? `${savedLine}L${savedPts[savedPts.length - 1][0]},${base}L${savedPts[0][0]},${base}Z` : "";
  const nowIdx = savedIdx[savedIdx.length - 1] ?? -1;
  const now = nowIdx >= 0 ? points[nowIdx] : null;
  const gap = now ? (now.saved ?? 0) - now.plan : 0;

  const verdict = (p: JourneyPoint) => {
    if (p.saved === null) return { text: "Ahead of you", cls: "text-ink-400" };
    const d = p.saved - p.plan;
    if (d === 0) return { text: "On plan", cls: "text-forest-700" };
    if (d > 0) return { text: `${naira(d)} ahead`, cls: "text-forest-700" };
    return { text: p.current ? `${naira(-d)} to go` : `${naira(-d)} behind`, cls: p.current ? "text-tide-700" : "text-danger-600" };
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-baseline gap-6">
          <div>
            <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ink-400">Saved today</p>
            <p className="tnum mt-1 font-mono text-[1.375rem] font-medium tracking-[-0.02em] text-ink-900">{naira(now?.saved ?? 0)}</p>
          </div>
          {now && (
            <div>
              <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ink-400">Against plan</p>
              <p className={cn("tnum mt-1 font-mono text-[1.375rem] font-medium tracking-[-0.02em]", gap >= 0 ? "text-forest-700" : now.current ? "text-tide-700" : "text-danger-600")}>
                {gap === 0 ? "On plan" : `${gap > 0 ? "+" : "−"}${nairaShort(Math.abs(gap))}`}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={() => setTable((t) => !t)}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-ink-500 transition hover:bg-sand hover:text-ink-800"
        >
          {table ? <LineChart className="size-3.5" /> : <Table2 className="size-3.5" />}
          {table ? "Chart" : "Table"}
        </button>
      </div>

      {table ? (
        <div className="max-h-[15rem] overflow-y-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-sand text-left text-xs text-ink-500">
              <tr>
                <th className="px-3 py-2 font-semibold">By</th>
                <th className="px-3 py-2 text-right font-semibold">Plan</th>
                <th className="px-3 py-2 text-right font-semibold">Saved</th>
                <th className="px-3 py-2 text-right font-semibold">Standing</th>
              </tr>
            </thead>
            <tbody className="tnum">
              {points.map((p) => {
                const v = verdict(p);
                return (
                  <tr key={p.month} className="border-t border-line">
                    <td className="px-3 py-2 text-ink-800">{formatDate(p.due)}</td>
                    <td className="px-3 py-2 text-right text-ink-600">{naira(p.plan)}</td>
                    <td className="px-3 py-2 text-right text-ink-900">{p.saved === null ? "—" : naira(p.saved)}</td>
                    <td className={cn("px-3 py-2 text-right text-xs font-semibold", v.cls)}>{v.text}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div ref={ref} className="relative" style={{ height: H }}>
            {w > 0 && (
              <svg width={w} height={H} role="img" aria-label={`Saved ${naira(now?.saved ?? 0)} against a plan of ${naira(now?.plan ?? 0)} so far`} className="block" onPointerLeave={() => setHover(null)}>
                <defs>
                  <linearGradient id="journey-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={C.contributions} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={C.contributions} stopOpacity={0} />
                  </linearGradient>
                </defs>
                {ticks.map((t) => (
                  <g key={t}>
                    <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke={C.grid} />
                    <text x={pad.l - 10} y={y(t)} dy="0.32em" textAnchor="end" className="tnum fill-ink-400 text-[11px]">
                      {nairaShort(t)}
                    </text>
                  </g>
                ))}
                <line x1={pad.l} x2={w - pad.r} y1={base} y2={base} stroke={C.axis} />
                {points.map((p, i) => (
                  <text key={p.month} x={x(i)} y={H - 7} textAnchor="middle" className={cn("text-[11px]", p.current ? "fill-ink-900 font-semibold" : "fill-ink-400")}>
                    {monthName(p.month).slice(0, slot < 34 ? 1 : 3)}
                  </text>
                ))}
                {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t - 6} y2={base} stroke={C.neutral} strokeDasharray="2 3" />}
                <path d={monotonePath(planPts)} fill="none" stroke={PLAN} strokeWidth={2} strokeDasharray="5 5" strokeLinecap="round" />
                {savedArea && <path d={savedArea} fill="url(#journey-fill)" />}
                {savedLine && <path d={savedLine} fill="none" stroke={C.contributions} strokeWidth={2.25} strokeLinejoin="round" strokeLinecap="round" />}
                {now && <circle cx={x(nowIdx)} cy={y(now.saved!)} r={5} fill={C.contributions} stroke={C.surface} strokeWidth={2.5} />}
                {hover !== null && points[hover].saved !== null && hover !== nowIdx && (
                  <circle cx={x(hover)} cy={y(points[hover].saved!)} r={4.5} fill={C.contributions} stroke={C.surface} strokeWidth={2} />
                )}
                {hover !== null && <circle cx={x(hover)} cy={y(points[hover].plan)} r={4} fill={C.surface} stroke={PLAN} strokeWidth={2} />}
                {/* direct labels */}
                {planPts.length > 0 && (
                  <text x={planPts[planPts.length - 1][0]} y={planPts[planPts.length - 1][1] - 10} textAnchor="end" className="fill-ink-500 text-[11px] font-semibold">
                    Plan
                  </text>
                )}
                {now && nowIdx < points.length - 1 && (
                  <text x={x(nowIdx) + 10} y={y(now.saved!) + 4} className="fill-ink-800 text-[11px] font-semibold">
                    Today
                  </text>
                )}
                {points.map((p, i) => (
                  <rect key={p.month} x={pad.l + slot * i} y={0} width={slot} height={H} fill="transparent" onPointerEnter={() => setHover(i)} />
                ))}
              </svg>
            )}
            {hover !== null && points[hover] && (
              <Tooltip x={x(hover)} width={w}>
                <p className="font-semibold text-ink-900">{formatMonth(points[hover].month)}</p>
                <p className="mt-0.5 text-[0.6875rem] text-ink-400">{points[hover].current ? "Today" : `By ${formatDate(points[hover].due, "short")}`}</p>
                <div className="mt-2 space-y-1.5">
                  <TipRow color={C.contributions} label="Saved" value={points[hover].saved === null ? "—" : naira(points[hover].saved)} />
                  <TipRow color={PLAN} label="Plan" value={naira(points[hover].plan)} />
                  <div className="flex justify-between border-t border-line pt-1.5">
                    <span className={cn("font-semibold", verdict(points[hover]).cls)}>{verdict(points[hover]).text}</span>
                  </div>
                </div>
              </Tooltip>
            )}
          </div>
          <div className="mt-3">
            <Legend
              items={[
                { color: C.contributions, label: "Saved" },
                { color: PLAN, label: "Plan, by each due date" },
              ]}
            />
          </div>
        </>
      )}
    </div>
  );
}
