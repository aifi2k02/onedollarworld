import type { Confidence, DollarBuy } from "@/lib/types";

// Visible trust signal — curated/verified data reads differently from estimates.
export function confidenceMeta(c: Confidence): { label: string; dot: string; text: string } {
  switch (c) {
    case "high":
      return { label: "verified", dot: "bg-emerald-400", text: "text-emerald-300" };
    case "medium":
      return { label: "reported", dot: "bg-emerald-400/70", text: "text-emerald-300/90" };
    case "low":
      return { label: "unverified", dot: "bg-amber-400", text: "text-amber-300/90" };
    default:
      return { label: "estimate", dot: "bg-amber-400/50", text: "text-amber-300/70" };
  }
}

// Sub-1 quantities in natural words. Finely bucketed so 0.96 reads "almost a",
// not "half a". Shared by the grid and the hero card so they never disagree.
function fractionOf(q: number, one: string): string {
  if (q >= 0.85) return `almost a ${one}`;
  if (q >= 0.55) return `over half a ${one}`;
  if (q >= 0.4) return `about half a ${one}`;
  if (q >= 0.28) return `a third of a ${one}`;
  if (q >= 0.18) return `a quarter of a ${one}`;
  if (q >= 0.08) return `a fraction of a ${one}`;
  return `barely any of a ${one}`;
}

// "5.6 transit rides", "almost a dozen", etc. — human, not robotic.
export function quantityPhrase(b: DollarBuy): string {
  const q = b.unitsPerUsd;
  const unit = b.unit;
  if (q <= 0) return "—";
  if (q >= 1) return `${trim(q)} ${q === 1 ? unit : pluralUnit(unit)}`;
  return fractionOf(q, unit);
}

export function localPriceLabel(b: DollarBuy): string {
  const v = b.localPrice >= 100 ? Math.round(b.localPrice).toLocaleString() : b.localPrice;
  return `${b.currencyCode} ${v}`;
}

// Nice human nouns for the hero card, e.g. "rides to work", "bottles of clean water".
const NOUNS: Record<string, [string, string]> = {
  meal_simple: ["simple meal", "simple meals"],
  water_bottle: ["bottle of clean water", "bottles of clean water"],
  bread: ["loaf of bread", "loaves of bread"],
  rice: ["kg of rice", "kg of rice"],
  eggs: ["dozen eggs", "dozen eggs"],
  milk: ["litre of milk", "litres of milk"],
  bus_fare: ["ride to work", "rides to work"],
  mobile_data: ["GB of data", "GB of data"],
  doctor_visit: ["doctor visit", "doctor visits"],
  labor_hour: ["hour of work", "hours of work"],
};

// Full hero phrase incl. the number, e.g. "4.4 rides to work" / "a third of a meal".
export function headlinePhrase(b: DollarBuy): string {
  const [one, many] = NOUNS[b.itemKey] ?? [b.unit, pluralUnit(b.unit)];
  const q = b.unitsPerUsd;
  if (q >= 1) return `${trim(q)} ${q === 1 ? one : many}`;
  return fractionOf(q, one);
}

// Units that read wrong with a trailing "s" (abbreviations / collectives).
const NO_PLURAL = new Set(["GB", "kg", "km", "dozen", "L", "ml"]);

function pluralUnit(unit: string): string {
  if (NO_PLURAL.has(unit)) return unit;
  if (unit.endsWith("loaf")) return unit.replace(/loaf$/, "loaves");
  return unit + "s";
}

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(n < 10 ? 1 : 0);
}
