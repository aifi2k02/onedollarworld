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
