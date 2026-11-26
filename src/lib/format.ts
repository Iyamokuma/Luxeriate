const TZ = "Africa/Lagos";

const nairaFmt = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });
const nairaFmt2 = new Intl.NumberFormat("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₦42,500 from 4250000 kobo */
export function naira(kobo: number | string | null | undefined, opts: { decimals?: boolean } = {}) {
  const n = Number(kobo ?? 0) / 100;
  return "₦" + (opts.decimals ? nairaFmt2.format(n) : nairaFmt.format(Math.round(n)));
}

/** ₦1.2m, ₦850k */
export function nairaShort(kobo: number | string | null | undefined) {
  const n = Number(kobo ?? 0) / 100;
  if (Math.abs(n) >= 1_000_000_000) return "₦" + trim(n / 1_000_000_000) + "bn";
  if (Math.abs(n) >= 1_000_000) return "₦" + trim(n / 1_000_000) + "m";
  if (Math.abs(n) >= 10_000) return "₦" + trim(n / 1_000) + "k";
  return "₦" + nairaFmt.format(n);
}

function trim(n: number) {
  return n.toFixed(n >= 100 ? 0 : 1).replace(/\.0$/, "");
}

export function number(n: number | string | null | undefined) {
  return nairaFmt.format(Number(n ?? 0));
}

export function quantity(n: number | string) {
  const v = Number(n);
  return Number.isInteger(v) ? nairaFmt.format(v) : v.toLocaleString("en-NG", { maximumFractionDigits: 2 });
}

function toDate(d: string | Date) {
  // Plain dates (YYYY-MM-DD) are calendar dates, not instants
  if (typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) return new Date(d + "T12:00:00+01:00");
  return new Date(d);
}

export function formatDate(d: string | Date | null | undefined, style: "short" | "medium" | "long" = "medium") {
  if (!d) return "—";
  const opts: Intl.DateTimeFormatOptions =
    style === "short"
      ? { day: "numeric", month: "short" }
      : style === "medium"
        ? { day: "numeric", month: "short", year: "numeric" }
        : { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: TZ }).format(toDate(d));
}

export function formatDateTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TZ,
  }).format(toDate(d));
}

export function formatMonth(d: string | Date, style: "long" | "short" = "long") {
  return new Intl.DateTimeFormat("en-GB", { month: style, year: "numeric", timeZone: TZ }).format(toDate(d));
}

export function monthName(d: string | Date, style: "long" | "short" = "short") {
  const name = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: TZ }).format(toDate(d));
  return style === "short" ? name.slice(0, 3) : name;
}

export function relativeTime(d: string | Date) {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.round(diff / 3600)} h ago`;
  if (diff < 86400 * 7) return `${Math.round(diff / 86400)} d ago`;
  return formatDate(d);
}

/** Today's date in Lagos as YYYY-MM-DD */
export function lagosToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

export function lagosHour() {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: TZ }).format(new Date()));
}

export function greeting() {
  const h = lagosHour();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function firstName(full: string | null | undefined) {
  return (full ?? "").trim().split(/\s+/)[0] || "there";
}

export function initials(full: string | null | undefined) {
  const parts = (full ?? "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export function plural(n: number, one: string, many = one + "s") {
  return `${number(n)} ${n === 1 ? one : many}`;
}

/** Normalise a Nigerian phone number to 234XXXXXXXXXX for wa.me links */
export function intlPhone(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return "234" + digits.slice(1);
  return digits;
}

export function whatsappLink(phone: string | null | undefined, text?: string) {
  const p = intlPhone(phone);
  const q = text ? `?text=${encodeURIComponent(text)}` : "";
  return p ? `https://wa.me/${p}${q}` : `https://wa.me/${q}`;
}

export function percent(part: number, whole: number) {
  if (!whole) return 0;
  return Math.max(0, Math.min(100, Math.round((part / whole) * 100)));
}

export function contributionPeriod(startMonth: string, months: number) {
  const start = toDate(startMonth);
  const end = new Date(start);
  end.setMonth(end.getMonth() + months - 1);
  return `${formatMonth(start, "short")} – ${formatMonth(end, "short")}`;
}
