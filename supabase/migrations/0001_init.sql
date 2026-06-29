-- OneDollar.World — core schema
-- Design rule: EVERY number a user sees can be traced to a source, a date, and a confidence level.
-- Macro stats (Tier 1) live in country_indicators; the comparable "hero basket" (Tier 2) lives in prices.
-- AI never writes into prices — it only writes prose (stored elsewhere / generated at runtime).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- sources : where every data point comes from. Nothing is shown without one.
-- ---------------------------------------------------------------------------
create table sources (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,         -- 'world_bank', 'wfp_hdx', 'ilostat', 'curated', 'estimate'
  name        text not null,
  url         text,
  license     text,                          -- 'CC BY 4.0', 'public domain', etc.
  tier        smallint not null,             -- 1 = authoritative spine, 2 = curated, 3 = crowd
  notes       text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- countries : factual master data (ISO, currency, region) + our launch bucket
-- ---------------------------------------------------------------------------
create table countries (
  id              uuid primary key default gen_random_uuid(),
  iso2            char(2) unique not null,    -- 'PK'
  iso3            char(3) unique not null,    -- 'PAK'
  name            text not null,
  slug            text unique not null,       -- 'pakistan'  -> /pakistan
  capital         text,
  region          text not null,              -- 'Asia', 'Africa', ...
  currency_code   char(3) not null,           -- 'PKR'
  currency_name   text,
  currency_symbol text,
  flag_emoji      text,
  population      bigint,
  -- launch role: 'anchor' = $1 is nothing, 'amplifier' = $1 is a lot, 'mid' = the gradient
  bucket          text not null check (bucket in ('anchor','amplifier','mid')),
  is_published    boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on countries (bucket);

-- ---------------------------------------------------------------------------
-- country_indicators : macro stats (Tier 1, auto-refreshed from open datasets)
-- one row per (country, indicator, year) so history is preserved
-- ---------------------------------------------------------------------------
create table country_indicators (
  id              uuid primary key default gen_random_uuid(),
  country_id      uuid not null references countries(id) on delete cascade,
  indicator_code  text not null,   -- see DATA-MODEL.md: gdp_per_capita, inflation_yoy,
                                    -- min_wage_month, avg_salary_month, ppp_factor
  value           numeric,
  unit            text,            -- 'USD', 'percent', 'local'
  year            int,
  source_id       uuid references sources(id),
  confidence      text not null default 'high' check (confidence in ('high','medium','low','estimate')),
  updated_at      timestamptz not null default now(),
  unique (country_id, indicator_code, year)
);

-- ---------------------------------------------------------------------------
-- exchange_rates : USD -> local, refreshed hourly. Keep history; read latest.
-- ---------------------------------------------------------------------------
create table exchange_rates (
  id              uuid primary key default gen_random_uuid(),
  base_currency   char(3) not null default 'USD',
  quote_currency  char(3) not null,
  rate            numeric not null,           -- 1 USD = <rate> quote_currency
  source_id       uuid references sources(id),
  fetched_at      timestamptz not null default now()
);
create index on exchange_rates (quote_currency, fetched_at desc);

-- ---------------------------------------------------------------------------
-- basket_items : the fixed, comparable "hero basket". Identical across every
-- country so comparison and the HPPP Index are apples-to-apples.
-- ---------------------------------------------------------------------------
create table basket_items (
  id             uuid primary key default gen_random_uuid(),
  key            text unique not null,        -- 'meal_simple'
  name           text not null,               -- 'Simple local meal'
  category       text not null,               -- food | water | transport | communication | health | labor
  unit           text not null,               -- '1 meal', '1.5 L', '1 dozen', '1 GB', '1 hour'
  description    text,
  display_order  int not null default 0,
  icon           text                         -- emoji or icon key
);

-- ---------------------------------------------------------------------------
-- prices : the heart of the product. Local price of one basket item, with
-- full provenance. USD value & "how much $1 buys" are derived, not stored.
-- ---------------------------------------------------------------------------
create table prices (
  id             uuid primary key default gen_random_uuid(),
  country_id     uuid not null references countries(id) on delete cascade,
  basket_item_id uuid not null references basket_items(id) on delete cascade,
  local_price    numeric not null,            -- in the country's local currency
  currency_code  char(3) not null,
  city           text,                        -- where observed (or 'national avg')
  source_id      uuid references sources(id),
  confidence     text not null check (confidence in ('high','medium','low','estimate')),
  observed_on    date,                        -- when the price was true
  notes          text,
  updated_at     timestamptz not null default now(),
  unique (country_id, basket_item_id, city)
);
create index on prices (country_id);

-- ---------------------------------------------------------------------------
-- hppp_scores : the proprietary Human Purchasing Power Index (0-100).
-- Recomputed from prices + indicators; components kept for transparency.
-- ---------------------------------------------------------------------------
create table hppp_scores (
  id                  uuid primary key default gen_random_uuid(),
  country_id          uuid not null references countries(id) on delete cascade,
  score               numeric not null check (score between 0 and 100),
  methodology_version text not null,
  components          jsonb,                  -- per-pillar sub-scores for "show your work"
  computed_at         timestamptz not null default now(),
  unique (country_id, methodology_version)
);

-- ---------------------------------------------------------------------------
-- v_dollar_buys : the launch magic, as a view.
-- For each country+item: USD price and HOW MANY UNITS one dollar buys.
-- ---------------------------------------------------------------------------
create view v_dollar_buys as
select
  c.slug                                   as country_slug,
  c.name                                   as country,
  c.bucket,
  bi.key                                   as item_key,
  bi.name                                  as item_name,
  bi.unit,
  bi.category,
  p.local_price,
  p.currency_code,
  er.rate                                  as usd_to_local,
  round(p.local_price / er.rate, 4)        as usd_price,
  round(er.rate / p.local_price, 2)        as units_per_usd,   -- "$1 buys this many"
  p.confidence,
  p.observed_on,
  src.name                                 as source_name
from prices p
join countries c       on c.id = p.country_id
join basket_items bi   on bi.id = p.basket_item_id
left join sources src  on src.id = p.source_id
join lateral (
  select rate from exchange_rates e
  where e.quote_currency = p.currency_code
  order by e.fetched_at desc
  limit 1
) er on true
where c.is_published;

-- ---------------------------------------------------------------------------
-- Row Level Security : public read of published data only.
-- ---------------------------------------------------------------------------
alter table countries          enable row level security;
alter table country_indicators enable row level security;
alter table exchange_rates     enable row level security;
alter table basket_items       enable row level security;
alter table prices             enable row level security;
alter table sources            enable row level security;
alter table hppp_scores        enable row level security;

create policy "public read published countries" on countries
  for select using (is_published = true);
create policy "public read indicators" on country_indicators for select using (true);
create policy "public read rates"      on exchange_rates     for select using (true);
create policy "public read basket"     on basket_items       for select using (true);
create policy "public read prices"     on prices             for select using (true);
create policy "public read sources"    on sources            for select using (true);
create policy "public read scores"     on hppp_scores        for select using (true);
-- Writes happen via service-role (ingestion jobs / admin) which bypasses RLS.
