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
