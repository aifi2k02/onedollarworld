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
