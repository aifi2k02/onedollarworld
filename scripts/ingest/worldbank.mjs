// Pipeline #2 — Macro indicators (monthly).
// Pulls inflation, GDP-per-capita, and PPP factor from the World Bank Indicators
// API (free, no key) for every country in the DB, and upserts the latest available
// value per (country, indicator, year) into Supabase `country_indicators`.
//
// World Bank quirks handled here:
//   • requires a User-Agent header (else its WAF returns an HTML "Request Error")
//   • `mrnev` is rejected → we request a date range and pick the latest non-null
//   • responses may carry a UTF-8 BOM → strip before JSON.parse
//
// Same pattern as fx.mjs: plain fetch, service_role via GitHub secret, auto-scales
// to the countries table.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const REST = `${SUPABASE_URL}/rest/v1`;
const sbHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

// our indicator_code  ->  World Bank series + unit
const INDICATORS = [
  { code: "inflation_yoy", wb: "FP.CPI.TOTL.ZG", unit: "percent" },
  { code: "gdp_per_capita", wb: "NY.GDP.PCAP.CD", unit: "USD" },
  { code: "ppp_factor", wb: "PA.NUS.PPP", unit: "LCU_per_intl$" },
];

const WB_UA = "Mozilla/5.0 (OneDollarWorld data ingest)";
const DATE_RANGE = "2015:2025"; // wide enough to always catch a recent value

async function sb(path, opts = {}) {
  const res = await fetch(`${REST}/${path}`, {
    ...opts,
    headers: { ...sbHeaders, ...(opts.headers || {}) },
  });
  if (!res.ok) {
    throw new Error(`${opts.method || "GET"} ${path} → ${res.status} ${await res.text()}`);
  }
  return res;
}

async function wb(series, codes) {
  const url =
    `https://api.worldbank.org/v2/country/${codes.join(";")}` +
    `/indicator/${series}?format=json&date=${DATE_RANGE}&per_page=20000`;
  const res = await fetch(url, { headers: { "User-Agent": WB_UA } });
  if (!res.ok) throw new Error(`World Bank ${series} → HTTP ${res.status}`);
  const json = JSON.parse((await res.text()).replace(/^﻿/, ""));
  if (!Array.isArray(json) || !Array.isArray(json[1])) {
    throw new Error(`World Bank ${series} → ${JSON.stringify(json).slice(0, 200)}`);
  }
  return json[1];
}

async function main() {
  // provenance
  const src = await (await sb("sources?key=eq.world_bank&select=id")).json();
  if (!src.length) throw new Error("source 'world_bank' not found — run the seed first.");
  const sourceId = src[0].id;

  // countries → id lookup by iso2 and iso3 (World Bank returns both)
  const countries = await (await sb("countries?select=id,iso2,iso3")).json();
  const byCode = new Map();
  for (const c of countries) {
    byCode.set(c.iso2, c.id);
    byCode.set(c.iso3, c.id);
  }
  const iso3 = countries.map((c) => c.iso3);

  const rows = [];
  for (const ind of INDICATORS) {
    const observations = await wb(ind.wb, iso3);
    // keep the latest non-null observation per country
    const latest = new Map();
    for (const o of observations) {
      if (o.value == null) continue;
      const id = byCode.get(o.countryiso3code) ?? byCode.get(o.country?.id);
      if (!id) continue;
      const prev = latest.get(id);
      if (!prev || Number(o.date) > Number(prev.date)) latest.set(id, o);
    }
    for (const [country_id, o] of latest) {
      rows.push({
        country_id,
        indicator_code: ind.code,
        value: o.value,
        unit: ind.unit,
        year: Number(o.date),
        source_id: sourceId,
        confidence: "high",
      });
    }
    console.log(`  ${ind.code}: ${latest.size} countries`);
  }

  if (rows.length === 0) throw new Error("No indicator values resolved — aborting.");

  // on_conflict names the unique constraint so re-runs UPDATE rather than collide.
  await sb("country_indicators?on_conflict=country_id,indicator_code,year", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });

  console.log(`✓ Upserted ${rows.length} macro indicator values across ${countries.length} countries.`);
}

main().catch((e) => {
  console.error("World Bank ingest failed:", e.message);
  process.exit(1);
});
