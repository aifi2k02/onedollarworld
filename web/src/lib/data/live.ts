// Build-time loader: pulls real data from Supabase so the static site renders
// genuine, sourced numbers. Overlays on the estimate model in index.ts — green
// where a pipeline has real data, amber where it's still derived.
//
// Uses the public (publishable) key over REST. If Supabase isn't configured or a
// fetch fails, returns null and the app falls back to the pure estimate model —
// so a network blip never breaks the build.

import type { Confidence } from "@/lib/types";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export interface LiveCountry {
  slug: string;
  name: string;
  iso2: string;
  flag: string;
  region: string;
  currencyCode: string;
  bucket: "anchor" | "amplifier" | "mid";
}

export interface LivePrice {
  localPrice: number;
  currencyCode: string;
  confidence: Confidence;
  source?: string;
  observedOn?: string;
}

export interface LiveData {
  countries: LiveCountry[];
  // currency code -> latest USD->local rate
  rates: Record<string, number>;
  // `${countrySlug}:${itemKey}` -> real price (estimates excluded)
  prices: Record<string, LivePrice>;
  // countrySlug -> GDP per capita (USD), drives the auto-derived estimate factors
  gdp: Record<string, number>;
}

let cache: LiveData | null | undefined;

async function rest(path: string): Promise<unknown[]> {
  // Default (cached) fetch: data is baked in at build time, so the static export
  // stays fully static. A fresh `next build` (nightly in CI) re-fetches current data.
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    headers: { apikey: KEY!, Authorization: `Bearer ${KEY!}` },
  });
  if (!res.ok) throw new Error(`Supabase ${path} → ${res.status}`);
  return (await res.json()) as unknown[];
}

// Loaded once per build, shared across all pages.
export async function loadLiveData(): Promise<LiveData | null> {
  if (cache !== undefined) return cache;
  if (!URL || !KEY) {
    cache = null;
    return null;
  }
  try {
    const [countriesRaw, ratesRaw, pricesRaw, itemsRaw, sourcesRaw, gdpRaw] = await Promise.all([
      rest("countries?select=slug,name,iso2,flag_emoji,region,currency_code,bucket&order=name"),
      rest("exchange_rates?select=quote_currency,rate,fetched_at&order=fetched_at.desc"),
      rest(
        "prices?select=local_price,currency_code,confidence,observed_on,source_id," +
          "basket_items(key),countries(slug)&confidence=in.(high,medium,low)",
      ),
      rest("basket_items?select=id,key"),
      rest("sources?select=id,name"),
      rest("country_indicators?select=value,countries(slug)&indicator_code=eq.gdp_per_capita"),
    ]);

    const countries: LiveCountry[] = (countriesRaw as Record<string, unknown>[]).map((c) => ({
      slug: c.slug as string,
      name: c.name as string,
      iso2: c.iso2 as string,
      flag: (c.flag_emoji as string) ?? "",
      region: c.region as string,
      currencyCode: c.currency_code as string,
      bucket: c.bucket as LiveCountry["bucket"],
    }));

    // latest rate per currency (rows already ordered newest-first)
    const rates: Record<string, number> = {};
    for (const r of ratesRaw as Record<string, unknown>[]) {
      const code = r.quote_currency as string;
      if (!(code in rates)) rates[code] = Number(r.rate);
    }

    const sourceName: Record<string, string> = {};
    for (const s of sourcesRaw as Record<string, unknown>[]) {
      sourceName[s.id as string] = s.name as string;
    }
    void itemsRaw; // basket ids mapped via embedded key below

    const prices: Record<string, LivePrice> = {};
    for (const p of pricesRaw as Record<string, unknown>[]) {
      const itemKey = (p.basket_items as { key?: string } | null)?.key;
      const slug = (p.countries as { slug?: string } | null)?.slug;
      if (!itemKey || !slug) continue;
      prices[`${slug}:${itemKey}`] = {
        localPrice: Number(p.local_price),
        currencyCode: p.currency_code as string,
        confidence: p.confidence as Confidence,
        source: sourceName[p.source_id as string],
        observedOn: (p.observed_on as string) ?? undefined,
      };
    }

    const gdp: Record<string, number> = {};
    for (const g of gdpRaw as Record<string, unknown>[]) {
      const slug = (g.countries as { slug?: string } | null)?.slug;
      if (slug && g.value != null) gdp[slug] = Number(g.value);
    }

    cache = { countries, rates, prices, gdp };
    console.log(
      `[live] Supabase: ${countries.length} countries, ${Object.keys(rates).length} rates, ${Object.keys(prices).length} real prices, ${Object.keys(gdp).length} GDP`,
    );
    return cache;
  } catch (e) {
    console.warn(`[live] Supabase load failed, falling back to estimate model: ${(e as Error).message}`);
    cache = null;
    return null;
  }
}
