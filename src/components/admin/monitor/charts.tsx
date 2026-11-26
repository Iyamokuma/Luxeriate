"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { niceStep, topRounded } from "@/components/admin/charts";
import { naira, nairaShort, number } from "@/lib/format";
import { cn } from "@/lib/utils";
import { C } from "./colors";

/*
 * Charts for the back-office overview. Every chart measures its own width and
 * draws at real pixel size, so strokes stay 2px and labels stay crisp. Colours
 * were checked with the dataviz palette validator on the cream surface.
 */



const TZ = "Africa/Lagos";
const dayFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
const shortFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: TZ });
const monLong = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: TZ });
const monFmt = { format: (d: Date) => monLong.format(d).slice(0, 3) };
const monYearFmt = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: TZ });
const asDate = (d: string) => new Date(`${d.slice(0, 10)}T12:00:00+01:00`);
const dayLabel = (d: string) => dayFmt.format(asDate(d));
const shortLabel = (d: string) => shortFmt.format(asDate(d));

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Monotone cubic curve through the points (never overshoots, so it never dips below zero). */
function monotonePath(pts: [number, number][]) {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    m[i] = (pts[i + 1][1] - pts[i][1]) / (dx[i] || 1);
  }
  const t: number[] = new Array(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${pts[i][0] + h},${pts[i][1] + h * t[i]} ${pts[i + 1][0] - h},${pts[i + 1][1] - h * t[i + 1]} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

/** Sits beside the hovered point (right of it, or left near the edge) so it never hides what it describes. */
function Tooltip({ x, width, dark, children }: { x: number; width: number; dark?: boolean; children: React.ReactNode }) {
  const W = 208;
  const gap = 14;
  const left = x + gap + W <= width ? x + gap : Math.max(0, x - gap - W);
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-none absolute top-0 z-10 w-[13rem] rounded-xl p-3 text-xs",
        dark ? "bg-night-3/95 text-ink-200 shadow-[0_12px_32px_-8px_rgb(0_0_0/0.6)] ring-1 ring-white/10 backdrop-blur" : "border border-line bg-cream text-ink-600 shadow-lift",
      )}
      style={{ left }}
    >
      {children}
    </div>
  );
}

function TipRow({ color, label, value, dark }: { color?: string; label: string; value: string; dark?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-1.5">
        {color && <span className="size-2 rounded-[2px]" style={{ background: color }} />}
        {label}
      </span>
      <span className={cn("tnum font-semibold", dark ? "text-cream" : "text-ink-900")}>{value}</span>
    </div>
  );
}

export function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-ink-600">
      {items.map((i) => (
        <span key={i.label} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pulse: 90 days of cash received, a gold line on the charcoal band
// ─────────────────────────────────────────────────────────────────────────────
export function PulseChart({ data, height = 120 }: { data: { d: string; c: number; f: number; n: number }[]; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const rows = useMemo(() => data.map((r) => ({ d: r.d, v: Number(r.c) + Number(r.f), n: Number(r.n) })), [data]);
  const total = rows.reduce((s, r) => s + r.v, 0);
  const max = Math.max(...rows.map((r) => r.v), 1);
  const pad = { t: 10, b: 22 };
  const plotH = height - pad.t - pad.b;
  const x = (i: number) => (rows.length > 1 ? (i / (rows.length - 1)) * w : w / 2);
  const y = (v: number) => pad.t + plotH - (v / max) * plotH;
  const pts: [number, number][] = rows.map((r, i) => [x(i), y(r.v)]);
  const line = w ? monotonePath(pts) : "";
  const base = pad.t + plotH;
  const area = line ? `${line}L${w},${base}L0,${base}Z` : "";

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (rows.length - 1));
    setHover(Math.max(0, Math.min(rows.length - 1, i)));
  }

  return (
    <div ref={ref} className="relative" style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={`Money received over the last ${rows.length} days: ${naira(total)}`} className="block overflow-visible">
          <defs>
            <linearGradient id="pulse-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={C.gold} stopOpacity={0.32} />
              <stop offset="100%" stopColor={C.gold} stopOpacity={0} />
            </linearGradient>
          </defs>
          <line x1={0} x2={w} y1={base} y2={base} stroke="rgb(255 255 255 / 0.1)" />
          {total > 0 && <path d={area} fill="url(#pulse-fill)" />}
          <path d={line} fill="none" stroke={C.gold} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" opacity={total > 0 ? 1 : 0.35} />
          {hover !== null && (
            <g>
              <line x1={pts[hover][0]} x2={pts[hover][0]} y1={pad.t - 4} y2={base} stroke="rgb(255 255 255 / 0.28)" strokeDasharray="2 3" />
              <circle cx={pts[hover][0]} cy={pts[hover][1]} r={4.5} fill={C.gold} stroke="#13110e" strokeWidth={2} />
            </g>
          )}
          {rows.length > 0 && (
            <g className="fill-ink-400 font-mono text-[10px] uppercase tracking-[0.08em]">
              <text x={0} y={height - 4}>{shortLabel(rows[0].d)}</text>
              <text x={w / 2} y={height - 4} textAnchor="middle">
                {shortLabel(rows[Math.floor(rows.length / 2)].d)}
              </text>
              <text x={w} y={height - 4} textAnchor="end">
                Today
              </text>
            </g>
          )}
          <rect
            x={0}
            y={0}
            width={w}
            height={base}
            fill="transparent"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
            tabIndex={0}
            aria-label="Inspect daily figures"
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setHover((h) => Math.max(0, (h ?? rows.length) - 1));
              if (e.key === "ArrowRight") setHover((h) => Math.min(rows.length - 1, (h ?? -1) + 1));
            }}
            onBlur={() => setHover(null)}
          />
        </svg>
      )}
      {total === 0 && w > 0 && (
        <p className="pointer-events-none absolute inset-x-0 top-[38%] text-center text-xs text-ink-400">The first payment will draw this line.</p>
      )}
      {hover !== null && rows[hover] && (
        <Tooltip x={pts[hover][0]} width={w} dark>
          <p className="font-semibold text-cream">{dayLabel(rows[hover].d)}</p>
          <div className="mt-1.5 space-y-1">
            <TipRow dark label="Received" value={naira(rows[hover].v)} />
            <TipRow dark label="Payments" value={number(rows[hover].n)} />
          </div>
        </Tooltip>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Cash flow: daily stacked bars (contributions + registration fees)
// ─────────────────────────────────────────────────────────────────────────────
export function FlowChart({ data }: { data: { d: string; c: number; f: number; n: number }[] }) {
  const [range, setRange] = useState<30 | 90>(30);
  const [table, setTable] = useState(false);
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const rows = useMemo(
    () => data.slice(-range).map((r) => ({ d: r.d, c: Math.max(0, Number(r.c)), f: Math.max(0, Number(r.f)), n: Number(r.n) })),
    [data, range],
  );
  const H = 248;
  const pad = { l: 50, r: 4, t: 12, b: 26 };
  const plotW = Math.max(0, w - pad.l - pad.r);
  const plotH = H - pad.t - pad.b;
  const total = rows.reduce((s, r) => s + r.c + r.f, 0);
  const count = rows.reduce((s, r) => s + r.n, 0);
  const rawMax = Math.max(...rows.map((r) => r.c + r.f), 0) || 5_000_000;
  const step = niceStep(rawMax / 4);
  const max = Math.ceil(rawMax / step) * step;
  const ticks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
  const slot = plotW / Math.max(rows.length, 1);
  const barW = Math.max(2, Math.min(14, slot * 0.62));
  const y = (v: number) => pad.t + plotH - (v / max) * plotH;
  const base = pad.t + plotH;
  const labelEvery = range === 30 ? 7 : 0;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-5">
          <div>
            <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ink-400">Received · {range} days</p>
            <p className="tnum mt-1 font-mono text-[1.375rem] font-medium tracking-[-0.02em] text-ink-900">{naira(total)}</p>
          </div>
          <div className="hidden sm:block">
            <p className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ink-400">Payments</p>
            <p className="tnum mt-1 font-mono text-[1.375rem] font-medium tracking-[-0.02em] text-ink-500">{number(count)}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-full bg-sand p-0.5 text-xs font-semibold" role="group" aria-label="Range">
            {([30, 90] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                className={cn("rounded-full px-3 py-1 transition", range === r ? "bg-cream text-ink-900 shadow-soft" : "text-ink-500 hover:text-ink-800")}
              >
                {r}d
              </button>
            ))}
          </div>
          <button
            onClick={() => setTable((t) => !t)}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-ink-500 transition hover:bg-sand hover:text-ink-800"
          >
            {table ? <BarChart3 className="size-3.5" /> : <Table2 className="size-3.5" />}
            {table ? "Chart" : "Table"}
          </button>
        </div>
      </div>

      {table ? (
        <div className="max-h-[15.5rem] overflow-y-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-sand text-left text-xs text-ink-500">
              <tr>
                <th className="px-3 py-2 font-semibold">Day</th>
                <th className="px-3 py-2 text-right font-semibold">Contributions</th>
                <th className="px-3 py-2 text-right font-semibold">Registration</th>
                <th className="px-3 py-2 text-right font-semibold">Payments</th>
              </tr>
            </thead>
            <tbody className="tnum">
              {[...rows].reverse().map((r) => (
                <tr key={r.d} className="border-t border-line">
                  <td className="px-3 py-2 text-ink-800">{dayLabel(r.d)}</td>
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
              <svg width={w} height={H} role="img" aria-label={`Money received per day, ${naira(total)} over ${range} days`} className="block" onPointerLeave={() => setHover(null)}>
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
                  const first = r.d.endsWith("-01");
                  const showLabel = labelEvery ? (rows.length - 1 - i) % labelEvery === 0 : first;
                  return (
                    <g key={r.d} opacity={hover !== null && hover !== i ? 0.4 : 1} className="transition-opacity duration-150">
                      {hc > 0 && (
                        <path d={hf > 0 ? `M${bx},${base}V${base - hc}H${bx + barW}V${base}Z` : topRounded(bx, base - hc, barW, hc, 3)} fill={C.contributions} />
                      )}
                      {hf > 0 && <path d={topRounded(bx, base - hc - gap - hf, barW, hf, 3)} fill={C.fees} />}
                      {showLabel && (
                        <text x={cx} y={H - 6} textAnchor="middle" className="fill-ink-400 text-[11px]">
                          {labelEvery ? shortLabel(r.d) : monFmt.format(asDate(r.d))}
                        </text>
                      )}
                      <rect x={pad.l + slot * i} y={pad.t} width={slot} height={plotH} fill="transparent" onPointerEnter={() => setHover(i)} />
                    </g>
                  );
                })}
                <line x1={pad.l} x2={w - pad.r} y1={base} y2={base} stroke="#d9cfc1" />
              </svg>
            )}
            {hover !== null && rows[hover] && (
              <Tooltip x={pad.l + slot * hover + slot / 2} width={w}>
                <p className="font-semibold text-ink-900">{dayLabel(rows[hover].d)}</p>
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

// ─────────────────────────────────────────────────────────────────────────────
// Sparkline for the vital-sign tiles
// ─────────────────────────────────────────────────────────────────────────────
export function Sparkline({
  values,
  labels,
  format = "number",
  unit,
  color = C.contributions,
  height = 40,
  label,
}: {
  values: number[];
  labels: string[];
  /** How the hovered value reads: naira from kobo, or a count with an optional unit ("activation"). */
  format?: "naira" | "number";
  unit?: string;
  color?: string;
  height?: number;
  label: string;
}) {
  const show = (v: number) => (format === "naira" ? naira(v) : unit ? `${number(v)} ${v === 1 ? unit : `${unit}s`}` : number(v));
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...values, 1);
  const x = (i: number) => (values.length > 1 ? 3 + (i / (values.length - 1)) * (w - 6) : w / 2);
  const y = (v: number) => 4 + (height - 8) * (1 - v / max);
  const pts: [number, number][] = values.map((v, i) => [x(i), y(v)]);
  const line = w ? monotonePath(pts) : "";
  const empty = values.every((v) => v === 0);
  const id = `spark-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div ref={ref} className="relative" style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={label} className="block overflow-visible">
          <defs>
            <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.18} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {!empty && <path d={`${line}L${x(values.length - 1)},${height}L${x(0)},${height}Z`} fill={`url(#${id})`} />}
          <path d={line} fill="none" stroke={empty ? C.neutral : color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={empty ? "3 4" : undefined} />
          {hover !== null && <circle cx={pts[hover][0]} cy={pts[hover][1]} r={3.5} fill={color} stroke="#fffdf9" strokeWidth={2} />}
          <rect
            x={0}
            y={0}
            width={w}
            height={height}
            fill="transparent"
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setHover(Math.max(0, Math.min(values.length - 1, Math.round(((e.clientX - r.left) / r.width) * (values.length - 1)))));
            }}
            onPointerLeave={() => setHover(null)}
          />
        </svg>
      )}
      {hover !== null && (
        <span
          className={cn(
            "pointer-events-none absolute z-10 -translate-y-1/2 whitespace-nowrap rounded-lg border border-line bg-cream px-2 py-1 text-[0.6875rem] text-ink-600 shadow-lift",
            pts[hover][0] > w / 2 && "-translate-x-full",
          )}
          style={{ left: pts[hover][0] + (pts[hover][0] > w / 2 ? -10 : 10), top: Math.min(height - 12, Math.max(12, pts[hover][1])) }}
        >
          {shortLabel(labels[hover])} · <span className="tnum font-semibold text-ink-900">{show(values[hover])}</span>
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Forecast: what is due each month and how much of it is already in
// ─────────────────────────────────────────────────────────────────────────────
export function ForecastChart({ data, today }: { data: { m: string; due_kobo: number; paid_kobo: number; customers: number }[]; today: string }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const rows = data.map((r) => ({ ...r, due: Number(r.due_kobo), paid: Number(r.paid_kobo), customers: Number(r.customers) }));
  const H = 250;
  const pad = { l: 0, r: 0, t: 26, b: 34 };
  const plotH = H - pad.t - pad.b;
  const max = Math.max(...rows.map((r) => r.due), 1);
  const slot = w / Math.max(rows.length, 1);
  const barW = Math.min(46, slot * 0.5);
  const base = pad.t + plotH;
  const empty = rows.every((r) => r.due === 0);
  const thisMonth = today.slice(0, 7);

  return (
    <div>
      <div ref={ref} className="relative" style={{ height: H }}>
        {w > 0 && (
          <svg width={w} height={H} role="img" aria-label="Money due per month and how much has been received" className="block" onPointerLeave={() => setHover(null)}>
            <line x1={0} x2={w} y1={base} y2={base} stroke="#d9cfc1" />
            {rows.map((r, i) => {
              const cx = slot * i + slot / 2;
              const bx = cx - barW / 2;
              const hDue = empty ? 0 : (r.due / max) * plotH;
              const hPaid = r.due ? (r.paid / r.due) * hDue : 0;
              const hRest = hDue - hPaid;
              const gap = hPaid > 0 && hRest > 0 ? 2 : 0;
              const pct = r.due ? Math.round((r.paid / r.due) * 100) : 0;
              const current = r.m.slice(0, 7) === thisMonth;
              return (
                <g key={r.m} opacity={hover !== null && hover !== i ? 0.45 : 1} className="transition-opacity duration-150">
                  {empty && <rect x={bx} y={base - 6} width={barW} height={6} rx={3} fill={C.grid} />}
                  {hRest - gap > 0.5 && <path d={topRounded(bx, base - hDue, barW, hRest - gap, 4)} fill={C.remaining} />}
                  {hPaid > 0 && <path d={hRest > 0 ? `M${bx},${base}V${base - hPaid}H${bx + barW}V${base}Z` : topRounded(bx, base - hPaid, barW, hPaid, 4)} fill={C.contributions} />}
                  {r.due > 0 && (
                    <text x={cx} y={base - hDue - 8} textAnchor="middle" className="tnum fill-ink-500 font-mono text-[10.5px]">
                      {nairaShort(r.due)}
                    </text>
                  )}
                  <text x={cx} y={H - 16} textAnchor="middle" className={cn("text-[11.5px]", current ? "fill-ink-900 font-semibold" : "fill-ink-500")}>
                    {monFmt.format(asDate(r.m))}
                  </text>
                  <text x={cx} y={H - 3} textAnchor="middle" className="tnum fill-ink-400 font-mono text-[10px]">
                    {r.due ? `${pct}%` : "—"}
                  </text>
                  <rect x={slot * i} y={0} width={slot} height={H} fill="transparent" onPointerEnter={() => setHover(i)} />
                </g>
              );
            })}
          </svg>
        )}
        {empty && w > 0 && (
          <p className="pointer-events-none absolute inset-x-0 top-[34%] text-center text-sm text-ink-400">Monthly schedules appear here once customers join.</p>
        )}
        {hover !== null && rows[hover] && !empty && (
          <Tooltip x={slot * hover + slot / 2} width={w}>
            <p className="font-semibold text-ink-900">{monYearFmt.format(asDate(rows[hover].m))}</p>
            <div className="mt-2 space-y-1.5">
              <TipRow color={C.contributions} label="Received" value={naira(rows[hover].paid)} />
              <TipRow color={C.remaining} label="Still to come" value={naira(rows[hover].due - rows[hover].paid)} />
              <div className="flex justify-between border-t border-line pt-1.5">
                <span>{number(rows[hover].customers)} customers</span>
                <span className="tnum font-semibold text-ink-900">{naira(rows[hover].due)}</span>
              </div>
            </div>
          </Tooltip>
        )}
      </div>
      <div className="mt-3">
        <Legend
          items={[
            { color: C.contributions, label: "Received" },
            { color: C.remaining, label: "Still to come" },
          ]}
        />
      </div>
      {!empty && rows[0] && (
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5 sm:grid-cols-4">
          <ForecastFigure label="Due this month" value={naira(rows[0].due)} />
          <ForecastFigure label="In so far" value={naira(rows[0].paid)} sub={`${Math.round((rows[0].paid / (rows[0].due || 1)) * 100)}% of the month`} />
          <ForecastFigure label="Still to come" value={naira(rows[0].due - rows[0].paid)} />
          <ForecastFigure label="Next six months" value={nairaShort(rows.reduce((t, r) => t + r.due, 0))} sub="Scheduled" />
        </dl>
      )}
    </div>
  );
}

function ForecastFigure({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-mono text-[0.625rem] font-medium uppercase tracking-[0.14em] text-ink-400">{label}</dt>
      <dd className="tnum mt-1.5 truncate font-mono text-[1rem] font-medium tracking-[-0.02em] text-ink-900">{value}</dd>
      {sub && <dd className="mt-0.5 truncate text-xs text-ink-400">{sub}</dd>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sign-ups: registrations (bars) and activations (line), 30 days
// ─────────────────────────────────────────────────────────────────────────────
export function SignupChart({ data }: { data: { d: string; joined: number; activated: number }[] }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const rows = data.map((r) => ({ d: r.d, j: Number(r.joined), a: Number(r.activated) }));
  const H = 170;
  const pad = { l: 26, r: 4, t: 10, b: 24 };
  const plotW = Math.max(0, w - pad.l - pad.r);
  const plotH = H - pad.t - pad.b;
  const rawMax = Math.max(...rows.map((r) => Math.max(r.j, r.a)), 0);
  const max = Math.max(4, Math.ceil(rawMax / 2) * 2);
  const ticks = [0, max / 2, max];
  const slot = plotW / Math.max(rows.length, 1);
  const barW = Math.max(2, Math.min(10, slot * 0.56));
  const y = (v: number) => pad.t + plotH - (v / max) * plotH;
  const base = pad.t + plotH;
  const linePts: [number, number][] = rows.map((r, i) => [pad.l + slot * i + slot / 2, y(r.a)]);
  return (
    <div>
      <div ref={ref} className="relative" style={{ height: H }}>
        {w > 0 && (
          <svg width={w} height={H} role="img" aria-label="Registrations and activations per day, last 30 days" className="block" onPointerLeave={() => setHover(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke={C.grid} />
                <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tnum fill-ink-400 text-[10.5px]">
                  {t}
                </text>
              </g>
            ))}
            {rows.map((r, i) => {
              const cx = pad.l + slot * i + slot / 2;
              const h = (r.j / max) * plotH;
              return (
                <g key={r.d} opacity={hover !== null && hover !== i ? 0.4 : 1}>
                  {h > 0 && <path d={topRounded(cx - barW / 2, base - h, barW, h, 3)} fill={C.contributions} />}
                  {(rows.length - 1 - i) % 7 === 0 && (
                    <text x={cx} y={H - 6} textAnchor="middle" className="fill-ink-400 text-[10.5px]">
                      {shortLabel(r.d)}
                    </text>
                  )}
                </g>
              );
            })}
            <path d={monotonePath(linePts)} fill="none" stroke={C.fees} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {hover !== null && linePts[hover] && <circle cx={linePts[hover][0]} cy={linePts[hover][1]} r={4} fill={C.fees} stroke="#fffdf9" strokeWidth={2} />}
            {rows.map((r, i) => (
              <rect key={r.d} x={pad.l + slot * i} y={pad.t} width={slot} height={plotH} fill="transparent" onPointerEnter={() => setHover(i)} />
            ))}
          </svg>
        )}
        {hover !== null && rows[hover] && (
          <Tooltip x={pad.l + slot * hover + slot / 2} width={w}>
            <p className="font-semibold text-ink-900">{dayLabel(rows[hover].d)}</p>
            <div className="mt-2 space-y-1.5">
              <TipRow color={C.contributions} label="Registered" value={number(rows[hover].j)} />
              <TipRow color={C.fees} label="Paid & activated" value={number(rows[hover].a)} />
            </div>
          </Tooltip>
        )}
      </div>
      <div className="mt-2">
        <Legend
          items={[
            { color: C.contributions, label: "Registered" },
            { color: C.fees, label: "Paid & activated" },
          ]}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Email delivery: sent / failed / skipped per day, 14 days
// ─────────────────────────────────────────────────────────────────────────────
export function EmailChart({ data }: { data: { d: string; sent: number; failed: number; skipped: number }[] }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const rows = data.map((r) => ({ d: r.d, s: Number(r.sent), f: Number(r.failed), k: Number(r.skipped) }));
  const H = 236;
  const pad = { l: 26, r: 4, t: 10, b: 24 };
  const plotW = Math.max(0, w - pad.l - pad.r);
  const plotH = H - pad.t - pad.b;
  const rawMax = Math.max(...rows.map((r) => r.s + r.f + r.k), 0);
  const max = Math.max(4, Math.ceil(rawMax / 4) * 4);
  const ticks = [0, max / 2, max];
  const slot = plotW / Math.max(rows.length, 1);
  const barW = Math.max(4, Math.min(18, slot * 0.56));
  const y = (v: number) => pad.t + plotH - (v / max) * plotH;
  const base = pad.t + plotH;
  return (
    <div>
      <div ref={ref} className="relative" style={{ height: H }}>
        {w > 0 && (
          <svg width={w} height={H} role="img" aria-label="Emails per day by outcome, last 14 days" className="block" onPointerLeave={() => setHover(null)}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.l} x2={w - pad.r} y1={y(t)} y2={y(t)} stroke={C.grid} />
                <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tnum fill-ink-400 text-[10.5px]">
                  {t}
                </text>
              </g>
            ))}
            {rows.map((r, i) => {
              const cx = pad.l + slot * i + slot / 2;
              const bx = cx - barW / 2;
              const segs = [
                { v: r.s, c: C.good },
                { v: r.f, c: C.critical },
                { v: r.k, c: C.neutral },
              ].filter((s) => s.v > 0);
              let top = base;
              return (
                <g key={r.d} opacity={hover !== null && hover !== i ? 0.4 : 1}>
                  {segs.map((s, j) => {
                    const h = (s.v / max) * plotH;
                    const yTop = top - h - (j > 0 ? 2 : 0);
                    const last = j === segs.length - 1;
                    const d = last ? topRounded(bx, yTop, barW, h, 3) : `M${bx},${yTop + h}V${yTop}H${bx + barW}V${yTop + h}Z`;
                    top = yTop;
                    return <path key={j} d={d} fill={s.c} />;
                  })}
                  {(rows.length - 1 - i) % 4 === 0 && (
                    <text x={cx} y={H - 6} textAnchor="middle" className="fill-ink-400 text-[10.5px]">
                      {shortLabel(r.d)}
                    </text>
                  )}
                  <rect x={pad.l + slot * i} y={pad.t} width={slot} height={plotH} fill="transparent" onPointerEnter={() => setHover(i)} />
                </g>
              );
            })}
          </svg>
        )}
        {hover !== null && rows[hover] && (
          <Tooltip x={pad.l + slot * hover + slot / 2} width={w}>
            <p className="font-semibold text-ink-900">{dayLabel(rows[hover].d)}</p>
            <div className="mt-2 space-y-1.5">
              <TipRow color={C.good} label="Delivered" value={number(rows[hover].s)} />
              <TipRow color={C.critical} label="Failed" value={number(rows[hover].f)} />
              <TipRow color={C.neutral} label="Skipped" value={number(rows[hover].k)} />
            </div>
          </Tooltip>
        )}
      </div>
      <div className="mt-2">
        <Legend
          items={[
            { color: C.good, label: "Delivered" },
            { color: C.critical, label: "Failed" },
            { color: C.neutral, label: "Skipped (turned off or duplicate)" },
          ]}
        />
      </div>
    </div>
  );
}
