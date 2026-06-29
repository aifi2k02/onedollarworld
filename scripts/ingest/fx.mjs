// Pipeline #1 — Exchange rates (daily).
// Fetches USD-based FX from open.er-api.com (free, no key, 160+ currencies) and
// appends a row per currency to Supabase `exchange_rates`. v_dollar_buys always
// reads the latest by fetched_at, so history accumulates harmlessly.
//
// Talks to Supabase via the PostgREST endpoint with plain fetch — no SDK, so no
// WebSocket/realtime baggage. Node 18+ has global fetch built in.
//
// Auto-scaling: it fetches rates for whatever currencies the `countries` table
// holds — add a country, its currency is picked up next run with zero code change.
//
// Auth: the SERVICE_ROLE key (bypasses RLS) lives ONLY as a GitHub Actions secret.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FX_ENDPOINT = "https://open.er-api.com/v6/latest/USD";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const REST = `${SUPABASE_URL}/rest/v1`;
const baseHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function sb(path, opts = {}) {
  const res = await fetch(`${REST}/${path}`, {
    ...opts,
    headers: { ...baseHeaders, ...(opts.headers || {}) },
  });
  if (!res.ok) {
    throw new Error(`${opts.method || "GET"} ${path} → ${res.status} ${await res.text()}`);
  }
  return res;
}

async function main() {
  // 1. Provenance: the 'fx_api' source id.
  const src = await (await sb("sources?key=eq.fx_api&select=id")).json();
  if (!src.length) throw new Error("source 'fx_api' not found — run the seed first.");
  const sourceId = src[0].id;

  // 2. Which currencies do we need? (auto-scales with the countries table)
  const countries = await (await sb("countries?select=currency_code")).json();
  const needed = [...new Set(countries.map((c) => c.currency_code))];

  // 3. Live USD-based rates.
  const res = await fetch(FX_ENDPOINT);
  if (!res.ok) throw new Error(`FX API HTTP ${res.status}`);
  const json = await res.json();
  if (json.result !== "success") throw new Error(`FX API result: ${json.result}`);

  // 4. One row per needed currency (skip any the feed lacks; never invent).
  const rows = [];
  const missing = [];
  for (const code of needed) {
    const rate = json.rates?.[code];
    if (typeof rate === "number" && rate > 0) {
      rows.push({ base_currency: "USD", quote_currency: code, rate, source_id: sourceId });
    } else {
      missing.push(code);
    }
  }
  if (rows.length === 0) throw new Error("No rates resolved — aborting.");

  // 5. Append (history kept; view reads latest).
  await sb("exchange_rates", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(rows),
  });

  console.log(`✓ Inserted ${rows.length} FX rates (USD base). Feed updated: ${json.time_last_update_utc}`);
  if (missing.length) console.warn(`⚠ No rate found for: ${missing.join(", ")}`);
}

main().catch((e) => {
  console.error("FX ingest failed:", e.message);
  process.exit(1);
});
