# Data ingestion

Scheduled jobs that keep Supabase fresh so prices/rates are never hand-typed.
Each job: fetch an official source → upsert into Supabase with `source`,
`confidence`, and a timestamp → let the app read the latest.

## Pipelines

| Job | Script | Source | Schedule | Status |
|---|---|---|---|---|
| Exchange rates | `fx.mjs` | open.er-api.com (free) | daily | ✅ built |
| Macro (inflation, GDP, PPP, wages) | `worldbank.mjs` | World Bank API | monthly | ▢ next |
| Food staples | `wfp.mjs` | WFP / HDX | weekly | ▢ |
| Cost-of-living items | `numbeo.mjs` | Numbeo API | monthly | ▢ |

## The pattern (copy this for new pipelines)

1. Connect with the **service_role** key (bypasses RLS — writes only).
2. Resolve the `sources.id` for provenance.
3. Read `countries` to know which countries/currencies to fetch — so adding a
   country auto-includes it with **zero code change**.
4. Fetch the official source; skip what it lacks; never invent numbers.
5. Insert/upsert with source + confidence + timestamp.

## Secrets (GitHub → Settings → Secrets and variables → Actions)

| Secret | Where to get it |
|---|---|
| `SUPABASE_URL` | `https://ssovcsdjbbvvxznejxdy.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → **service_role** (secret) |

⚠️ The `service_role` key has full DB access and bypasses RLS. It lives **only**
as a GitHub Actions secret — never in the repo, never in client code, never pasted
into chat.

## Run locally (optional)

```bash
cd scripts/ingest && npm install
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node fx.mjs
```
