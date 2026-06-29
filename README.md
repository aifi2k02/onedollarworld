# OneDollar.World

**The world's first Human Purchasing Power Platform.** Not a charity, not a currency
converter, not a cost-of-living site — a data + media brand that answers one question:

> What can **one dollar** actually *do* — and how differently does it work across the planet?

The magic is the asymmetry: the same $1 you'd barely notice is a full meal, or a day of
safe drinking water, somewhere else. We make people feel that gap, backed by data they
can trust.

Domain: **OneDollarWorld.xyz**

---

## What's in this repo right now

This is the **data foundation** — built before any UI, because the data *is* the product.

```
docs/
  DATA-MODEL.md      how the schema enforces "every number has a source + date + confidence"
  HPPP-INDEX.md      methodology for the signature 0–100 score (published openly)
  COUNTRIES.md       the 24 launch countries and why each was chosen
supabase/
  migrations/0001_init.sql      full schema + RLS + the v_dollar_buys view
  seed/01..05                   sources, 24 countries, hero basket, FX rates, worked example
  templates/prices_template.csv the 220-row curation sheet for the remaining countries
```

## The data trust model (the whole point)

Three tiers, and **confidence is always visible**:

1. **Tier 1 spine** — World Bank, IMF, ILOSTAT, WFP/HDX food prices, Big Mac Index,
   live FX. Authoritative, never wrong, free.
2. **Tier 2 curated** — a fixed 10-item "hero basket" hand-verified per country at launch.
3. **Tier 3 crowd** — local submissions (post-launch moat), shown with city + date.

AI writes prose only — **never invents a number**.

## Launch scope (deliberately small)

24 countries in three buckets — **anchors** (USA, UK, DE, CH, JP, AU: $1 is nothing),
**amplifiers** (PK, IN, BD, NP, NG, KE, EG, ET, VN, ID, PH, GH: $1 is a lot), and
**mid** (BR, MX, TR, ZA, TH, MA: the gradient). See [docs/COUNTRIES.md](docs/COUNTRIES.md).

v1 ships one magic loop, not a platform: **pick a country → see what $1 does → share a
beautiful card.** Globe, gamification, "If You Lived Here", and the full 20-category data
set are explicitly v2+.

## Getting the seed running

```bash
# with the Supabase CLI and a local stack:
supabase start
psql "$DATABASE_URL" -f supabase/migrations/0001_init.sql
for f in supabase/seed/*.sql; do psql "$DATABASE_URL" -f "$f"; done

# sanity check the magic view (Pakistan + USA are pre-published):
psql "$DATABASE_URL" -c "select country, item_name, unit, usd_price, units_per_usd, confidence from v_dollar_buys order by country, item_name;"
```

Everything in the worked example is `confidence = 'estimate'` (UNVERIFIED). Replace with
curated values and flip `is_published` per country before going live.

## Tech stack (planned)

Next.js (App Router) · TypeScript · Tailwind · shadcn/ui · Framer Motion ·
Supabase (Postgres/Auth/Storage/Edge) · Cloudflare Pages/CDN · Mapbox/Leaflet · Recharts.
