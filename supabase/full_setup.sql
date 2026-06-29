-- OneDollar.World — full setup (schema + seed).
-- Paste into Supabase Dashboard → SQL Editor → Run. Idempotent-ish: run once on a fresh project.
-- Generated from migrations/ + seed/ in load order.


-- ============================================================
-- migrations/0001_init.sql
-- ============================================================
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

-- ============================================================
-- seed/01_sources.sql
-- ============================================================
-- Tier 1 = authoritative spine (auto), Tier 2 = curated, Tier 3 = crowd.
insert into sources (key, name, url, license, tier, notes) values
  ('world_bank', 'World Bank Open Data', 'https://data.worldbank.org', 'CC BY 4.0', 1, 'GDP/capita, population, inflation, PPP factor'),
  ('imf',        'IMF Data',             'https://www.imf.org/en/Data', 'see IMF terms', 1, 'PPP, macro'),
  ('ilostat',    'ILOSTAT',              'https://ilostat.ilo.org',     'CC BY 4.0', 1, 'wages, minimum wage'),
  ('wfp_hdx',    'WFP / Humanitarian Data Exchange', 'https://data.humdata.org', 'varies / mostly open', 1, 'real market food prices by city + date'),
  ('big_mac',    'The Economist Big Mac Index', 'https://github.com/TheEconomist/big-mac-data', 'MIT', 1, 'recognisable PPP anchor'),
  ('fx_api',     'FX rate provider (live)', null, 'per provider', 1, 'USD->local, refreshed hourly'),
  ('curated',    'OneDollar.World curated', null, 'internal', 2, 'hand-verified hero-basket value at launch'),
  ('estimate',   'Placeholder estimate (UNVERIFIED)', null, 'internal', 2, 'ballpark only — MUST be replaced with a curated/Tier-1 value before publish'),
  ('crowd',      'Community contribution', null, 'user-submitted', 3, 'local submission, shown with city + date, low confidence until verified');

-- ============================================================
-- seed/02_countries.sql
-- ============================================================
-- 24 launch countries. Metadata (ISO, currency, capital, region) is factual.
-- population ~ rounded; refresh from World Bank on first ingest.
-- bucket: anchor = $1 is nothing | amplifier = $1 is a lot | mid = the gradient
-- is_published stays false until the country's hero basket is curated & verified.

insert into countries
  (iso2, iso3, name, slug, capital, region, currency_code, currency_name, currency_symbol, flag_emoji, population, bucket, is_published) values
-- ANCHORS (6) ---------------------------------------------------------------
  ('US','USA','United States','united-states','Washington, D.C.','North America','USD','US Dollar','$','🇺🇸',  335000000,'anchor', false),
  ('GB','GBR','United Kingdom','united-kingdom','London','Europe','GBP','Pound Sterling','£','🇬🇧',   68000000,'anchor', false),
  ('DE','DEU','Germany','germany','Berlin','Europe','EUR','Euro','€','🇩🇪',                          84000000,'anchor', false),
  ('CH','CHE','Switzerland','switzerland','Bern','Europe','CHF','Swiss Franc','CHF','🇨🇭',             8800000,'anchor', false),
  ('JP','JPN','Japan','japan','Tokyo','Asia','JPY','Yen','¥','🇯🇵',                                 124000000,'anchor', false),
  ('AU','AUS','Australia','australia','Canberra','Oceania','AUD','Australian Dollar','$','🇦🇺',       26600000,'anchor', false),
-- AMPLIFIERS (12) -----------------------------------------------------------
  ('PK','PAK','Pakistan','pakistan','Islamabad','Asia','PKR','Pakistani Rupee','₨','🇵🇰',           241000000,'amplifier', false),
  ('IN','IND','India','india','New Delhi','Asia','INR','Indian Rupee','₹','🇮🇳',                   1430000000,'amplifier', false),
  ('BD','BGD','Bangladesh','bangladesh','Dhaka','Asia','BDT','Taka','৳','🇧🇩',                       173000000,'amplifier', false),
  ('NP','NPL','Nepal','nepal','Kathmandu','Asia','NPR','Nepalese Rupee','₨','🇳🇵',                    30500000,'amplifier', false),
  ('NG','NGA','Nigeria','nigeria','Abuja','Africa','NGN','Naira','₦','🇳🇬',                          224000000,'amplifier', false),
  ('KE','KEN','Kenya','kenya','Nairobi','Africa','KES','Kenyan Shilling','Sh','🇰🇪',                  55000000,'amplifier', false),
  ('EG','EGY','Egypt','egypt','Cairo','Africa','EGP','Egyptian Pound','£','🇪🇬',                     112000000,'amplifier', false),
  ('ET','ETH','Ethiopia','ethiopia','Addis Ababa','Africa','ETB','Birr','Br','🇪🇹',                  126000000,'amplifier', false),
  ('VN','VNM','Vietnam','vietnam','Hanoi','Asia','VND','Dong','₫','🇻🇳',                              99000000,'amplifier', false),
  ('ID','IDN','Indonesia','indonesia','Jakarta','Asia','IDR','Rupiah','Rp','🇮🇩',                    278000000,'amplifier', false),
  ('PH','PHL','Philippines','philippines','Manila','Asia','PHP','Philippine Peso','₱','🇵🇭',         117000000,'amplifier', false),
  ('GH','GHA','Ghana','ghana','Accra','Africa','GHS','Cedi','₵','🇬🇭',                                34000000,'amplifier', false),
-- MID (6) -------------------------------------------------------------------
  ('BR','BRA','Brazil','brazil','Brasília','South America','BRL','Real','R$','🇧🇷',                  216000000,'mid', false),
  ('MX','MEX','Mexico','mexico','Mexico City','North America','MXN','Mexican Peso','$','🇲🇽',         129000000,'mid', false),
  ('TR','TUR','Türkiye','turkiye','Ankara','Asia','TRY','Turkish Lira','₺','🇹🇷',                     85000000,'mid', false),
  ('ZA','ZAF','South Africa','south-africa','Pretoria','Africa','ZAR','Rand','R','🇿🇦',               60000000,'mid', false),
  ('TH','THA','Thailand','thailand','Bangkok','Asia','THB','Baht','฿','🇹🇭',                          72000000,'mid', false),
  ('MA','MAR','Morocco','morocco','Rabat','Africa','MAD','Dirham','DH','🇲🇦',                         37000000,'mid', false);

-- ============================================================
-- seed/03_basket_items.sql
-- ============================================================
-- The hero basket: 10 fixed, comparable items measured identically in every country.
-- This fixed list is what makes cross-country comparison and the HPPP Index valid.
-- Changing units here is a breaking change — bump methodology_version if you do.

insert into basket_items (key, name, category, unit, description, display_order, icon) values
  ('meal_simple',  'Simple local meal',          'food',          '1 meal',   'One basic sit-down/street meal a local would actually eat', 1, '🍽️'),
  ('water_bottle', 'Bottled water',              'water',         '1.5 L',    'One 1.5 litre bottle of safe drinking water',               2, '💧'),
  ('bread',        'Loaf of bread',              'food',          '1 loaf',   'One ~500g loaf of standard local bread',                    3, '🍞'),
  ('rice',         'Rice',                       'food',          '1 kg',     'One kilogram of standard white rice',                       4, '🍚'),
  ('eggs',         'Eggs',                       'food',          '1 dozen',  'Twelve regular chicken eggs',                               5, '🥚'),
  ('milk',         'Milk',                       'food',          '1 L',      'One litre of regular fresh milk',                           6, '🥛'),
  ('bus_fare',     'Local transit fare',         'transport',     '1 ride',   'One one-way local bus / minibus / transit ride',            7, '🚌'),
  ('mobile_data',  'Mobile data',                'communication', '1 GB',     'One gigabyte of prepaid mobile data',                       8, '📱'),
  ('doctor_visit', 'Basic doctor visit',         'health',        '1 visit',  'One consultation with a general practitioner',              9, '🩺'),
  ('labor_hour',   'Hour of minimum-wage work',  'labor',         '1 hour',   'What one hour of minimum-wage labour pays (the earn side)', 10,'⏱️');

-- ============================================================
-- seed/04_exchange_rates.sql
-- ============================================================
-- Ballpark USD->local rates for local dev so v_dollar_buys works immediately.
-- In production these are OVERWRITTEN hourly by the FX ingestion job — do not
-- treat these as accurate. 1 USD = <rate> local.
insert into exchange_rates (base_currency, quote_currency, rate, source_id)
select 'USD', q.code, q.rate, (select id from sources where key = 'fx_api')
from (values
  ('USD',   1.00),  ('GBP',   0.79),  ('EUR',   0.92),  ('CHF',   0.89),
  ('JPY', 157.00),  ('AUD',   1.52),  ('PKR', 280.00),  ('INR',  85.00),
  ('BDT', 118.00),  ('NPR', 134.00),  ('NGN',1550.00),  ('KES', 129.00),
  ('EGP',  48.00),  ('ETB', 122.00),  ('VND',25400.00), ('IDR',16200.00),
  ('PHP',  58.00),  ('GHS',  15.00),  ('BRL',   5.40),  ('MXN',  18.50),
  ('TRY',  39.00),  ('ZAR',  18.20),  ('THB',  36.50),  ('MAD',   9.90)
) as q(code, rate);

-- ============================================================
-- seed/05_prices_example.sql
-- ============================================================
-- WORKED EXAMPLE: Pakistan (amplifier) + United States (anchor).
-- Purpose: prove the loop end-to-end so the front end has real rows to render.
--
-- ⚠️ EVERY value below is confidence='estimate' / source='estimate' = UNVERIFIED.
-- These are ballparks, not facts. Before either country is published
-- (is_published=true) each row must be replaced with a curated/Tier-1 value
-- and re-tagged 'high'/'medium'. This is the honesty contract of the product.

-- Helper: resolve ids inline.
with c as (
  select id, slug, currency_code from countries where slug in ('pakistan','united-states')
), bi as (
  select id, key from basket_items
), s as (
  select id from sources where key = 'estimate'
)
insert into prices (country_id, basket_item_id, local_price, currency_code, city, source_id, confidence, observed_on, notes)
select c.id, bi.id, v.local_price, c.currency_code, v.city,
       (select id from s), 'estimate', date '2026-06-29', 'UNVERIFIED placeholder — replace before publish'
from (values
  -- Pakistan (PKR), national-ish ballparks
  ('pakistan','meal_simple',   250.0, 'national avg'),
  ('pakistan','water_bottle',   80.0, 'national avg'),
  ('pakistan','bread',         150.0, 'national avg'),
  ('pakistan','rice',          250.0, 'national avg'),
  ('pakistan','eggs',          320.0, 'national avg'),
  ('pakistan','milk',          220.0, 'national avg'),
  ('pakistan','bus_fare',       50.0, 'national avg'),
  ('pakistan','mobile_data',    50.0, 'national avg'),
  ('pakistan','doctor_visit',1000.0, 'national avg'),
  ('pakistan','labor_hour',    190.0, 'national avg'),
  -- United States (USD)
  ('united-states','meal_simple',  12.0,  'national avg'),
  ('united-states','water_bottle',  1.8,  'national avg'),
  ('united-states','bread',         2.8,  'national avg'),
  ('united-states','rice',          2.5,  'national avg'),
  ('united-states','eggs',          3.5,  'national avg'),
  ('united-states','milk',          1.0,  'national avg'),
  ('united-states','bus_fare',      2.75, 'national avg'),
  ('united-states','mobile_data',   4.0,  'national avg'),
  ('united-states','doctor_visit',130.0,  'national avg'),
  ('united-states','labor_hour',    7.25, 'national avg')
) as v(slug, item_key, local_price, city)
join c  on c.slug = v.slug
join bi on bi.key = v.item_key;

-- Flip the two worked-example countries on so v_dollar_buys returns rows in dev.
-- (Real countries stay unpublished until curated.)
update countries set is_published = true where slug in ('pakistan','united-states');
