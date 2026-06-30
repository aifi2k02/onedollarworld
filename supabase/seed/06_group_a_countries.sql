-- Group A expansion: 31 WFP-covered countries (real food data available).
-- Estimate factors are auto-derived from World Bank GDP at build time — no per-
-- country tuning needed. Currencies verified present in the FX feed.
-- NOTE: Sierra Leone uses SLL (old leone) — that's what WFP reports in; using the
-- redenominated SLE would make prices 1000x wrong.

insert into countries
  (iso2, iso3, name, slug, capital, region, currency_code, currency_name, currency_symbol, flag_emoji, population, bucket, is_published) values
-- amplifiers (24) -----------------------------------------------------------
  ('BF','BFA','Burkina Faso','burkina-faso','Ouagadougou','Africa','XOF','West African CFA franc','Fr','🇧🇫', 23000000,'amplifier', true),
  ('CM','CMR','Cameroon','cameroon','Yaoundé','Africa','XAF','Central African CFA franc','Fr','🇨🇲', 28000000,'amplifier', true),
  ('TD','TCD','Chad','chad','N''Djamena','Africa','XAF','Central African CFA franc','Fr','🇹🇩', 18000000,'amplifier', true),
  ('CI','CIV','Côte d''Ivoire','cote-divoire','Yamoussoukro','Africa','XOF','West African CFA franc','Fr','🇨🇮', 28000000,'amplifier', true),
  ('DJ','DJI','Djibouti','djibouti','Djibouti','Africa','DJF','Djiboutian franc','Fdj','🇩🇯', 1100000,'amplifier', true),
  ('GM','GMB','Gambia','gambia','Banjul','Africa','GMD','Dalasi','D','🇬🇲', 2700000,'amplifier', true),
  ('GN','GIN','Guinea','guinea','Conakry','Africa','GNF','Guinean franc','FG','🇬🇳', 14000000,'amplifier', true),
  ('LS','LSO','Lesotho','lesotho','Maseru','Africa','LSL','Lesotho loti','L','🇱🇸', 2300000,'amplifier', true),
  ('MG','MDG','Madagascar','madagascar','Antananarivo','Africa','MGA','Malagasy ariary','Ar','🇲🇬', 30000000,'amplifier', true),
  ('MW','MWI','Malawi','malawi','Lilongwe','Africa','MWK','Malawian kwacha','MK','🇲🇼', 21000000,'amplifier', true),
  ('MR','MRT','Mauritania','mauritania','Nouakchott','Africa','MRU','Mauritanian ouguiya','UM','🇲🇷', 4900000,'amplifier', true),
  ('MZ','MOZ','Mozambique','mozambique','Maputo','Africa','MZN','Mozambican metical','MT','🇲🇿', 33000000,'amplifier', true),
  ('NE','NER','Niger','niger','Niamey','Africa','XOF','West African CFA franc','Fr','🇳🇪', 26000000,'amplifier', true),
  ('CG','COG','Republic of the Congo','congo-republic','Brazzaville','Africa','XAF','Central African CFA franc','Fr','🇨🇬', 6000000,'amplifier', true),
  ('RW','RWA','Rwanda','rwanda','Kigali','Africa','RWF','Rwandan franc','FRw','🇷🇼', 14000000,'amplifier', true),
  ('SN','SEN','Senegal','senegal','Dakar','Africa','XOF','West African CFA franc','Fr','🇸🇳', 18000000,'amplifier', true),
  ('SL','SLE','Sierra Leone','sierra-leone','Freetown','Africa','SLL','Sierra Leonean leone','Le','🇸🇱', 8600000,'amplifier', true),
  ('UG','UGA','Uganda','uganda','Kampala','Africa','UGX','Ugandan shilling','USh','🇺🇬', 48000000,'amplifier', true),
  ('KH','KHM','Cambodia','cambodia','Phnom Penh','Asia','KHR','Cambodian riel','៛','🇰🇭', 17000000,'amplifier', true),
  ('KG','KGZ','Kyrgyzstan','kyrgyzstan','Bishkek','Asia','KGS','Kyrgyzstani som','с','🇰🇬', 7000000,'amplifier', true),
  ('LA','LAO','Laos','laos','Vientiane','Asia','LAK','Lao kip','₭','🇱🇦', 7500000,'amplifier', true),
  ('TJ','TJK','Tajikistan','tajikistan','Dushanbe','Asia','TJS','Tajikistani somoni','SM','🇹🇯', 10000000,'amplifier', true),
  ('TL','TLS','Timor-Leste','timor-leste','Dili','Asia','USD','US dollar','$','🇹🇱', 1300000,'amplifier', true),
  ('NI','NIC','Nicaragua','nicaragua','Managua','North America','NIO','Nicaraguan córdoba','C$','🇳🇮', 7000000,'amplifier', true),
-- mid (7) -------------------------------------------------------------------
  ('DZ','DZA','Algeria','algeria','Algiers','Africa','DZD','Algerian dinar','دج','🇩🇿', 45000000,'mid', true),
  ('IQ','IRQ','Iraq','iraq','Baghdad','Asia','IQD','Iraqi dinar','ع.د','🇮🇶', 43000000,'mid', true),
  ('JO','JOR','Jordan','jordan','Amman','Asia','JOD','Jordanian dinar','د.ا','🇯🇴', 11000000,'mid', true),
  ('BO','BOL','Bolivia','bolivia','Sucre','South America','BOB','Bolivian boliviano','Bs','🇧🇴', 12000000,'mid', true),
  ('EC','ECU','Ecuador','ecuador','Quito','South America','USD','US dollar','$','🇪🇨', 18000000,'mid', true),
  ('AM','ARM','Armenia','armenia','Yerevan','Asia','AMD','Armenian dram','֏','🇦🇲', 3000000,'mid', true),
  ('MD','MDA','Moldova','moldova','Chișinău','Europe','MDL','Moldovan leu','L','🇲🇩', 2600000,'mid', true)
on conflict (iso2) do nothing;
