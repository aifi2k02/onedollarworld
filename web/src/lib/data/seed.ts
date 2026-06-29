// ⚠️ DEMO SEED — illustrative estimates only, NOT verified facts.
// This mirrors what Supabase will return so the UI runs today. Every value here
// is confidence='estimate'. Real prices come from the curated Supabase data.
//
// To avoid hand-entering 170 numbers, per-country local prices are DERIVED from:
//   - a USD baseline price per basket item (roughly US-level)
//   - a per-country goods price-level factor (relative to US = 1.0)
//   - a per-country min-wage USD/hour (the "earn side")
// then converted to local currency via the FX rate. Internally consistent and
// plausible — good enough to feel the product, honest about being estimates.

import type { BasketItem, Bucket, Country } from "@/lib/types";

export const BASKET: BasketItem[] = [
  { key: "meal_simple", name: "Simple local meal", category: "food", unit: "meal", icon: "🍽️" },
  { key: "water_bottle", name: "Bottled water", category: "water", unit: "1.5L bottle", icon: "💧" },
  { key: "bread", name: "Loaf of bread", category: "food", unit: "loaf", icon: "🍞" },
  { key: "rice", name: "Rice", category: "food", unit: "kg", icon: "🍚" },
  { key: "eggs", name: "Eggs", category: "food", unit: "dozen", icon: "🥚" },
  { key: "milk", name: "Milk", category: "food", unit: "litre", icon: "🥛" },
  { key: "bus_fare", name: "Local transit ride", category: "transport", unit: "ride", icon: "🚌" },
  { key: "mobile_data", name: "Mobile data", category: "communication", unit: "GB", icon: "📱" },
  { key: "doctor_visit", name: "Basic doctor visit", category: "health", unit: "visit", icon: "🩺" },
  { key: "labor_hour", name: "Hour of min-wage work", category: "labor", unit: "hour", icon: "⏱️" },
];

// Two anchors per item: the US price and a low-income "floor" price. A country's
// real price is interpolated between them by its development level `t` (0..1).
// This is what stops a $12 US meal from staying $12 everywhere — a simple local
// meal has its own floor (~$0.5), so $1 genuinely buys a meal where it should.
export const USD_BASELINE: Record<string, number> = {
  meal_simple: 10, water_bottle: 1.8, bread: 2.8, rice: 2.5, eggs: 3.5,
  milk: 1.0, bus_fare: 2.75, mobile_data: 4.0, doctor_visit: 120, labor_hour: 7.25,
};
export const USD_FLOOR: Record<string, number> = {
  meal_simple: 0.5, water_bottle: 0.2, bread: 0.25, rice: 0.5, eggs: 0.9,
  milk: 0.4, bus_fare: 0.12, mobile_data: 0.15, doctor_visit: 2.0, labor_hour: 0.3,
};

// 1 USD = <rate> local currency (matches supabase/seed/04_exchange_rates.sql).
export const FX: Record<string, number> = {
  USD: 1, GBP: 0.79, EUR: 0.92, CHF: 0.89, JPY: 157, AUD: 1.52,
  PKR: 280, INR: 85, BDT: 118, NPR: 134, NGN: 1550, KES: 129,
  EGP: 48, ETB: 122, VND: 25400, IDR: 16200, PHP: 58, GHS: 15,
  BRL: 5.4, MXN: 18.5, TRY: 39, ZAR: 18.2, THB: 36.5, MAD: 9.9,
};

interface Seed extends Country {
  t: number; // development level 0..1: interpolates each price between floor and US
  wageUsdPerHour: number; // min-wage in USD/hour (the labor_hour "earn side")
}

// CURATED real prices — these OVERRIDE the derived estimate and carry real
// provenance (this is the Supabase `prices` table in miniature). Keyed by
// `${countrySlug}:${itemKey}`. localPrice is in the country's currency.
export interface CuratedPrice {
  localPrice: number;
  confidence: "high" | "medium" | "low";
  source: string;
  observedOn: string;
  note?: string;
}
export const CURATED: Record<string, CuratedPrice> = {
  // Pakistan milk: PKR 210–240/litre (local report, 2026-06-29) → midpoint 225.
  "pakistan:milk": {
    localPrice: 225,
    confidence: "medium",
    source: "Local report",
    observedOn: "2026-06-29",
    note: "Reported range PKR 210–240/litre",
  },
};

// Subset wired for the demo: all 12 amplifiers + key anchors + a couple of mid.
export const COUNTRIES: Seed[] = [
  // anchors
  { slug: "united-states", name: "United States", iso2: "US", flag: "🇺🇸", region: "North America", currencyCode: "USD", bucket: "anchor", t: 1.0, wageUsdPerHour: 7.25 },
  { slug: "united-kingdom", name: "United Kingdom", iso2: "GB", flag: "🇬🇧", region: "Europe", currencyCode: "GBP", bucket: "anchor", t: 1.0, wageUsdPerHour: 11 },
  { slug: "japan", name: "Japan", iso2: "JP", flag: "🇯🇵", region: "Asia", currencyCode: "JPY", bucket: "anchor", t: 0.92, wageUsdPerHour: 8 },
  // amplifiers
  { slug: "nigeria", name: "Nigeria", iso2: "NG", flag: "🇳🇬", region: "Africa", currencyCode: "NGN", bucket: "amplifier", t: 0.05, wageUsdPerHour: 0.4 },
  { slug: "egypt", name: "Egypt", iso2: "EG", flag: "🇪🇬", region: "Africa", currencyCode: "EGP", bucket: "amplifier", t: 0.04, wageUsdPerHour: 0.5 },
  { slug: "ethiopia", name: "Ethiopia", iso2: "ET", flag: "🇪🇹", region: "Africa", currencyCode: "ETB", bucket: "amplifier", t: 0.03, wageUsdPerHour: 0.3 },
  { slug: "kenya", name: "Kenya", iso2: "KE", flag: "🇰🇪", region: "Africa", currencyCode: "KES", bucket: "amplifier", t: 0.06, wageUsdPerHour: 0.6 },
  { slug: "ghana", name: "Ghana", iso2: "GH", flag: "🇬🇭", region: "Africa", currencyCode: "GHS", bucket: "amplifier", t: 0.05, wageUsdPerHour: 0.5 },
  { slug: "pakistan", name: "Pakistan", iso2: "PK", flag: "🇵🇰", region: "Asia", currencyCode: "PKR", bucket: "amplifier", t: 0.04, wageUsdPerHour: 0.7 },
  { slug: "india", name: "India", iso2: "IN", flag: "🇮🇳", region: "Asia", currencyCode: "INR", bucket: "amplifier", t: 0.045, wageUsdPerHour: 0.6 },
  { slug: "bangladesh", name: "Bangladesh", iso2: "BD", flag: "🇧🇩", region: "Asia", currencyCode: "BDT", bucket: "amplifier", t: 0.035, wageUsdPerHour: 0.4 },
  { slug: "nepal", name: "Nepal", iso2: "NP", flag: "🇳🇵", region: "Asia", currencyCode: "NPR", bucket: "amplifier", t: 0.045, wageUsdPerHour: 0.5 },
  { slug: "vietnam", name: "Vietnam", iso2: "VN", flag: "🇻🇳", region: "Asia", currencyCode: "VND", bucket: "amplifier", t: 0.07, wageUsdPerHour: 0.8 },
  { slug: "indonesia", name: "Indonesia", iso2: "ID", flag: "🇮🇩", region: "Asia", currencyCode: "IDR", bucket: "amplifier", t: 0.08, wageUsdPerHour: 0.7 },
  { slug: "philippines", name: "Philippines", iso2: "PH", flag: "🇵🇭", region: "Asia", currencyCode: "PHP", bucket: "amplifier", t: 0.09, wageUsdPerHour: 0.8 },
  // mid
  { slug: "brazil", name: "Brazil", iso2: "BR", flag: "🇧🇷", region: "South America", currencyCode: "BRL", bucket: "mid", t: 0.30, wageUsdPerHour: 1.5 },
  { slug: "mexico", name: "Mexico", iso2: "MX", flag: "🇲🇽", region: "North America", currencyCode: "MXN", bucket: "mid", t: 0.30, wageUsdPerHour: 1.2 },
  { slug: "turkiye", name: "Türkiye", iso2: "TR", flag: "🇹🇷", region: "Asia", currencyCode: "TRY", bucket: "mid", t: 0.32, wageUsdPerHour: 3.0 },
  { slug: "south-africa", name: "South Africa", iso2: "ZA", flag: "🇿🇦", region: "Africa", currencyCode: "ZAR", bucket: "mid", t: 0.35, wageUsdPerHour: 1.8 },
  { slug: "thailand", name: "Thailand", iso2: "TH", flag: "🇹🇭", region: "Asia", currencyCode: "THB", bucket: "mid", t: 0.35, wageUsdPerHour: 2.0 },
  { slug: "morocco", name: "Morocco", iso2: "MA", flag: "🇲🇦", region: "Africa", currencyCode: "MAD", bucket: "mid", t: 0.28, wageUsdPerHour: 1.3 },
];
