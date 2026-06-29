// Data access layer. Today it computes from the local seed; tomorrow these same
// async signatures wrap Supabase queries against the v_dollar_buys view.
// The UI never changes when that swap happens.

import type { Country, DollarBuy } from "@/lib/types";
import { BASKET, COUNTRIES, CURATED, FX, USD_BASELINE, USD_FLOOR } from "./seed";

export async function getCountries(): Promise<Country[]> {
  return COUNTRIES.map(({ t: _t, wageUsdPerHour: _w, ...c }) => c);
}

export async function getCountry(slug: string): Promise<Country | null> {
  return (await getCountries()).find((c) => c.slug === slug) ?? null;
}

// The core of v_dollar_buys: for one country, what $1 does for every basket item.
export async function getDollarBuys(slug: string): Promise<DollarBuy[]> {
  const seed = COUNTRIES.find((c) => c.slug === slug);
  if (!seed) return [];
  const rate = FX[seed.currencyCode] ?? 1;

  return BASKET.map((item) => {
    const curated = CURATED[`${slug}:${item.key}`];

    // A curated real price wins and carries its own confidence + source.
    // Otherwise: labor uses the country's wage; goods interpolate between their
    // floor price and the US price by the country's level `t` (an estimate).
    let localPrice: number;
    let usdPrice: number;
    let confidence: "high" | "medium" | "low" | "estimate";
    let source: string | undefined;

    if (curated) {
      localPrice = curated.localPrice;
      usdPrice = localPrice / rate;
      confidence = curated.confidence;
      source = curated.source;
    } else {
      usdPrice =
        item.key === "labor_hour"
          ? seed.wageUsdPerHour
          : USD_FLOOR[item.key] +
            (USD_BASELINE[item.key] - USD_FLOOR[item.key]) * seed.t;
      localPrice = usdPrice * rate;
      confidence = "estimate";
    }

    const unitsPerUsd = usdPrice > 0 ? 1 / usdPrice : 0;
    return {
      itemKey: item.key,
      itemName: item.name,
      unit: item.unit,
      icon: item.icon,
      category: item.category,
      localPrice: round(localPrice, rate >= 100 ? 0 : 2),
      currencyCode: seed.currencyCode,
      usdPrice: round(usdPrice, 4),
      unitsPerUsd: round(unitsPerUsd, 2),
      confidence,
      source,
    };
  });
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
