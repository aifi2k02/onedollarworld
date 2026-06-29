# OneDollar.World — Data Model

The product's only real asset is **trustworthy data with visible provenance**. The
schema enforces one rule: *every number a user sees traces to a source, a date, and
a confidence level.*

## Tables

| Table | Holds | Tier / refresh |
|---|---|---|
| `sources` | Where each datum comes from + its trust tier | — |
| `countries` | Factual master data + launch `bucket` | static |
| `country_indicators` | Macro stats (GDP/capita, inflation, wages, PPP) | **Tier 1**, auto |
| `exchange_rates` | USD→local, history kept, latest read | **Tier 1**, hourly |
| `basket_items` | The fixed 10-item "hero basket" | static |
| `prices` | Local price of one basket item, fully sourced | **Tier 2/3** |
| `hppp_scores` | The Human Purchasing Power Index (0–100) | derived |
| `v_dollar_buys` | View: USD price + "how many units $1 buys" | derived |

## The three data tiers (and how confidence maps)

1. **Tier 1 — authoritative spine.** World Bank, IMF, ILOSTAT, WFP/HDX food prices,
   Big Mac Index, live FX. Free, citable, never *wrong*. → `confidence = high`.
2. **Tier 2 — curated.** Hand-verified hero-basket value at launch. → `medium`–`high`.
3. **Tier 3 — crowd.** Local submissions, shown with city + date. → `low` until verified.

`confidence = 'estimate'` is a **temporary placeholder** that must never reach a
published country. It exists only so the front end has rows during development.

## How "$1 buys X" is computed (never stored)

```
units_per_usd = exchange_rate(USD→local) / local_price_per_unit
usd_price      = local_price_per_unit / exchange_rate(USD→local)
```

Derived live in `v_dollar_buys` so it's always consistent with the latest FX rate.
Example — Pakistan, simple meal at PKR 250, rate 280:
`units_per_usd = 280 / 250 = 1.12 meals` → "**$1 ≈ a full meal in Pakistan**".

## indicator_code vocabulary (`country_indicators`)

`gdp_per_capita` · `inflation_yoy` · `min_wage_month` · `avg_salary_month` ·
`avg_daily_wage` · `ppp_factor`. Add new codes here, never as new columns.

## The hard rule on AI

AI (Stitch) may generate **prose only** — country summaries, illustrative day-in-the-life
stories (labelled), plain-English explainers. It **never writes a number into `prices`
or `country_indicators`.** One wrong viral fact ends the brand.

## Load order

```
migrations/0001_init.sql
seed/01_sources.sql
seed/02_countries.sql
seed/03_basket_items.sql
seed/04_exchange_rates.sql
seed/05_prices_example.sql   # Pakistan + USA worked example (all 'estimate')
```

Then curate `templates/prices_template.csv` (220 rows) → import → flip
`is_published = true` per country once its basket is verified.
