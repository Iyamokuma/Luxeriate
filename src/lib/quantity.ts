import { quantity } from "@/lib/format";

const SHORT: Record<string, string> = {
  kg: "kg",
  kgs: "kg",
  kilograms: "kg",
  g: "g",
  litres: "L",
  litre: "L",
  liters: "L",
  liter: "L",
  l: "L",
  ml: "ml",
};

const SINGULAR: Record<string, string> = {
  packs: "pack",
  tins: "tin",
  cartons: "carton",
  tubers: "tuber",
  bags: "bag",
  bottles: "bottle",
  crates: "crate",
  pieces: "piece",
  sachets: "sachet",
  cups: "cup",
  baskets: "basket",
  paints: "paint",
};

/** "50 kg", "25 L", "1 carton", "12 tins" */
export function qtyLabel(q: number | string, unit: string | null | undefined) {
  const n = Number(q);
  const u = (unit ?? "").trim();
  if (!u) return quantity(n);
  const lower = u.toLowerCase();
  if (SHORT[lower]) return `${quantity(n)} ${SHORT[lower]}`;
  if (n === 1 && SINGULAR[lower]) return `1 ${SINGULAR[lower]}`;
  return `${quantity(n)} ${u}`;
}
