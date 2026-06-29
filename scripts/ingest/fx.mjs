// Pipeline #1 — Exchange rates (daily).
// Fetches USD-based FX from open.er-api.com (free, no key, 160+ currencies) and
// appends a row per currency to Supabase `exchange_rates`. The v_dollar_buys view
// always reads the latest by fetched_at, so history accumulates harmlessly.
//
// Auto-scaling: it fetches rates for whatever currencies the `countries` table
// contains — add a country, its currency is picked up next run with zero code change.
//
// Auth: writes via the SERVICE_ROLE key (bypasses RLS). That key lives ONLY as a
// GitHub Actions secret — never in the repo, never in the client.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FX_ENDPOINT = "https://open.er-api.com/v6/latest/USD";

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  // 1. Resolve the 'fx_api' source id (provenance for every row).
  const { data: src, error: srcErr } = await supabase
    .from("sources")
    .select("id")
    .eq("key", "fx_api")
    .single();
  if (srcErr) throw new Error(`sources lookup failed: ${srcErr.message}`);

  // 2. Which currencies do we actually need? (auto-scales with the countries table)
  const { data: countries, error: cErr } = await supabase
    .from("countries")
    .select("currency_code");
  if (cErr) throw new Error(`countries lookup failed: ${cErr.message}`);
  const needed = [...new Set(countries.map((c) => c.currency_code))];

  // 3. Fetch live USD-based rates.
  const res = await fetch(FX_ENDPOINT);
  if (!res.ok) throw new Error(`FX API HTTP ${res.status}`);
  const json = await res.json();
  if (json.result !== "success") throw new Error(`FX API result: ${json.result}`);

  // 4. Build one row per needed currency (skip any the feed lacks).
  const rows = [];
  const missing = [];
  for (const code of needed) {
    const rate = json.rates?.[code];
    if (typeof rate === "number" && rate > 0) {
      rows.push({ base_currency: "USD", quote_currency: code, rate, source_id: src.id });
    } else {
      missing.push(code);
    }
  }

  if (rows.length === 0) throw new Error("No rates resolved — aborting.");

  // 5. Append (history kept; view reads latest).
  const { error: insErr } = await supabase.from("exchange_rates").insert(rows);
  if (insErr) throw new Error(`insert failed: ${insErr.message}`);

  console.log(`✓ Inserted ${rows.length} FX rates (USD base). Feed updated: ${json.time_last_update_utc}`);
  if (missing.length) console.warn(`⚠ No rate found for: ${missing.join(", ")}`);
}

main().catch((e) => {
  console.error("FX ingest failed:", e.message);
  process.exit(1);
});
