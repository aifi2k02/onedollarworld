// Pipeline #3 — Food staple prices (weekly).
// Real WFP market prices via HDX HAPI (free; app_identifier = base64 of name:email,
// no approval). Fills the grocery items of the hero basket — rice, eggs, milk,
// bread — with actual RETAIL prices, averaged across markets, for the countries
// WFP monitors (mostly amplifiers; anchors like the US aren't covered → Numbeo later).
//
// For each (country, item): find the matching commodities, take the latest reporting
// month, average price across all markets, normalize the unit to ours, and — when a
// commodity has variants (e.g. basmati vs coarse rice) — keep the cheapest, i.e. the
// everyday staple, which is what "what $1 buys" should reflect.
//
// Same pattern as the other jobs: plain fetch, service_role via GitHub secret,
// auto-scales to the countries table. Writes confidence='high', source=wfp_hdx.

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

const HAPI = "https://hapi.humdata.org/api/v2/food-security-nutrition-poverty/food-prices-market-monitor";
const APP_ID = Buffer.from("onedollarworld:bestfordaily@gmail.com").toString("base64");

// our basket item  ->  how to recognise it in WFP + the unit family we normalize to
const FOOD_MAP = [
  { item: "rice", match: /rice/i, family: "KG" }, // → price per kg
  { item: "eggs", match: /egg/i, family: "DOZEN" }, // → price per dozen
  { item: "milk", match: /milk/i, family: "L" }, // → price per litre
  { item: "bread", match: /bread/i, family: "LOAF" }, // → price per loaf
];

async function sb(path, opts = {}) {
  const res = await fetch(`${REST}/${path}`, {
    ...opts,
    headers: { ...sbHeaders, ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`${opts.method || "GET"} ${path} → ${res.status} ${await res.text()}`);
  return res;
}

// Convert a WFP price+unit into our per-unit price for a target family. Returns
// null if the unit doesn't belong to the family.
function normalize(price, unitRaw, family) {
  const m = String(unitRaw).trim().match(/^([\d.]+)?\s*(.*)$/);
  const mult = m && m[1] ? parseFloat(m[1]) : 1;
  const base = (m ? m[2] : unitRaw).toUpperCase().trim();
  const per = price / (mult || 1); // price for ONE of the base unit
  switch (family) {
    case "KG":
      return /^(KG|KILOGRAM)/.test(base) ? per : null;
    case "L":
      return /^(L|LITRE|LITER)/.test(base) ? per : null;
    case "DOZEN":
      if (/^DOZEN/.test(base)) return per;
      if (/^(UNIT|PCS|PIECE|EACH|EGG)/.test(base)) return per * 12; // per egg → per dozen
      return null;
    case "LOAF":
      return /^(LOAF|UNIT|PIECE|PCS)/.test(base) ? per : null;
    default:
      return null;
  }
}

async function fetchCountry(iso3) {
  const start = new Date(Date.now() - 150 * 864e5).toISOString().slice(0, 10);
  const rows = [];
  for (let offset = 0; ; offset += 5000) {
    const url =
      `${HAPI}?app_identifier=${APP_ID}&location_code=${iso3}&price_type=Retail` +
      `&start_date=${start}&output_format=json&limit=5000&offset=${offset}`;
    const res = await fetch(url, { headers: { "User-Agent": "OneDollarWorld/1.0" } });
    if (!res.ok) throw new Error(`HAPI ${iso3} → HTTP ${res.status}`);
    const page = (await res.json()).data || [];
    rows.push(...page);
    if (page.length < 5000) break;
  }
  return rows;
}

// For a set of WFP rows of one commodity: latest reporting month, averaged across
// markets, normalized. Returns { price, observed_on } or null.
function latestAvg(commodityRows, family) {
  const latestPeriod = commodityRows.reduce(
    (mx, r) => (r.reference_period_start > mx ? r.reference_period_start : mx),
    "",
  );
  const sameMonth = commodityRows.filter((r) => r.reference_period_start === latestPeriod);
  const normed = sameMonth.map((r) => normalize(r.price, r.unit, family)).filter((v) => v != null && v > 0);
  if (!normed.length) return null;
  const avg = normed.reduce((a, b) => a + b, 0) / normed.length;
  return { price: avg, observed_on: latestPeriod.slice(0, 10) };
}

async function main() {
  const src = await (await sb("sources?key=eq.wfp_hdx&select=id")).json();
  if (!src.length) throw new Error("source 'wfp_hdx' not found — run the seed first.");
  const sourceId = src[0].id;

  const countries = await (await sb("countries?select=id,iso3,currency_code")).json();
  const items = await (await sb("basket_items?select=id,key")).json();
  const itemId = Object.fromEntries(items.map((i) => [i.key, i.id]));

  const rows = [];
  for (const c of countries) {
    let data;
    try {
      data = await fetchCountry(c.iso3);
    } catch (e) {
      console.warn(`  ${c.iso3}: fetch failed (${e.message})`);
      continue;
    }
    if (!data.length) continue;

    const filled = [];
    for (const f of FOOD_MAP) {
      // candidate commodities whose name matches and whose unit fits the family
      const candidates = {};
      for (const r of data) {
        if (!f.match.test(r.commodity_name)) continue;
        if (normalize(r.price, r.unit, f.family) == null) continue;
        (candidates[r.commodity_name] = candidates[r.commodity_name] || []).push(r);
      }
      // for each candidate commodity, compute latest national avg; keep the cheapest
      let best = null;
      for (const name in candidates) {
        const a = latestAvg(candidates[name], f.family);
        if (a && (!best || a.price < best.price)) best = a;
      }
      if (!best || !itemId[f.item]) continue;
      filled.push(f.item);
      rows.push({
        country_id: c.id,
        basket_item_id: itemId[f.item],
        local_price: Math.round(best.price * 100) / 100,
        currency_code: c.currency_code,
        city: "national avg",
        source_id: sourceId,
        confidence: "high",
        observed_on: best.observed_on,
        notes: "WFP retail, market average",
      });
    }
    if (filled.length) console.log(`  ${c.iso3}: ${filled.join(", ")}`);
  }

  if (rows.length === 0) throw new Error("No WFP prices resolved — aborting.");

  await sb("prices", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(rows),
  });

  console.log(`✓ Upserted ${rows.length} WFP food prices across ${new Set(rows.map((r) => r.country_id)).size} countries.`);
}

main().catch((e) => {
  console.error("WFP ingest failed:", e.message);
  process.exit(1);
});
