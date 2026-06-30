// Data access layer. Reads REAL data from Supabase (built at deploy time) and
// overlays it on the estimate model: a pipeline's real price wins; otherwise we
// fall back to the derived estimate so every country still shows a full basket.
// FX comes live from Supabase too. If Supabase is unreachable, the pure estimate
// model is used — the build never breaks.

import type { Country, DollarBuy } from "@/lib/types";
import { BASKET, COUNTRIES, CURATED, FX, USD_BASELINE, USD_FLOOR } from "./seed";
import { loadLiveData } from "./live";

const seedBySlug = (slug: string) => COUNTRIES.find((c) => c.slug === slug);

// Estimate factors derived from GDP-per-capita (calibrated against hand values):
//   t (price level 0..1) ≈ gdp / 35000, capped
//   wage (USD/hr) ≈ 0.011 · gdp^0.57  (sub-linear, like real min wages)
// So adding a country needs no hand-tuning — World Bank GDP drives the fallback.
function factorsFromGdp(gdp: number | undefined): { t: number; wage: number } {
  const g = gdp && gdp > 0 ? gdp : 3000; // generic developing-country default
  const t = Math.min(1, Math.max(0.02, g / 35000));
  const wage = Math.min(30, Math.max(0.2, 0.011 * Math.pow(g, 0.57)));
  return { t, wage };
}

export async function getCountries(): Promise<Country[]> {
  const live = await loadLiveData();
  if (live && live.countries.length) {
    return live.countries.map((c) => ({
      slug: c.slug,
      name: c.name,
      iso2: c.iso2,
      flag: c.flag,
      region: c.region,
      currencyCode: c.currencyCode,
      bucket: c.bucket,
    }));
  }
  return COUNTRIES.map(({ t: _t, wageUsdPerHour: _w, ...c }) => c);
}

export async function getCountry(slug: string): Promise<Country | null> {
  return (await getCountries()).find((c) => c.slug === slug) ?? null;
}

// For one country, what $1 does for every basket item — real price where a
// pipeline has it, derived estimate otherwise.
export async function getDollarBuys(slug: string): Promise<DollarBuy[]> {
  const live = await loadLiveData();
  const country = (await getCountries()).find((c) => c.slug === slug);
  if (!country) return [];
  const seed = seedBySlug(slug);
  const currency = country.currencyCode;
  const rate = live?.rates[currency] ?? FX[currency] ?? 1;
  // GDP from Supabase; offline fallback approximates it from any legacy seed t.
  const gdp = live?.gdp[slug] ?? (seed ? seed.t * 35000 : undefined);
  const { t, wage } = factorsFromGdp(gdp);

  const out: DollarBuy[] = [];
  for (const item of BASKET) {
    const key = `${slug}:${item.key}`;
    const livePrice = live?.prices[key];
    const curated = CURATED[key];

    let localPrice: number;
    let usdPrice: number;
    let confidence: DollarBuy["confidence"];
    let source: string | undefined;

    if (livePrice) {
      // real, sourced data from a pipeline wins
      localPrice = livePrice.localPrice;
      usdPrice = localPrice / rate;
      confidence = livePrice.confidence;
      source = livePrice.source;
    } else if (curated) {
      localPrice = curated.localPrice;
      usdPrice = localPrice / rate;
      confidence = curated.confidence;
      source = curated.source;
    } else {
      // derived estimate — factors auto-computed from GDP, so any country renders
      usdPrice =
        item.key === "labor_hour"
          ? wage
          : USD_FLOOR[item.key] + (USD_BASELINE[item.key] - USD_FLOOR[item.key]) * t;
      localPrice = usdPrice * rate;
      confidence = "estimate";
    }

    const unitsPerUsd = usdPrice > 0 ? 1 / usdPrice : 0;
    out.push({
      itemKey: item.key,
      itemName: item.name,
      unit: item.unit,
      icon: item.icon,
      category: item.category,
      localPrice: round(localPrice, rate >= 100 ? 0 : 2),
      currencyCode: currency,
      usdPrice: round(usdPrice, 4),
      unitsPerUsd: round(unitsPerUsd, 2),
      confidence,
      source,
    });
  }
  return out;
}

// "Headline" item = the single most dramatic thing $1 buys (most units, excluding
// the labor row which is the earn-side, not a buy). Drives the rotating hero.
export async function getHeadline(slug: string): Promise<DollarBuy | null> {
  const buys = (await getDollarBuys(slug)).filter((b) => b.category !== "labor");
  if (!buys.length) return null;
  return buys.reduce((best, b) => (b.unitsPerUsd > best.unitsPerUsd ? b : best));
}

// The most dramatic amplifier (highest single units-per-$1) — drives the homepage
// default selection and its share image.
export async function getTopCountrySlug(): Promise<string> {
  const countries = await getCountries();
  let best = "ethiopia";
  let bestUnits = -1;
  for (const c of countries) {
    if (c.bucket === "anchor") continue;
    const h = await getHeadline(c.slug);
    if (h && h.unitsPerUsd > bestUnits) {
      bestUnits = h.unitsPerUsd;
      best = c.slug;
    }
  }
  return best;
}

function round(n: number, dp: number): number {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}
