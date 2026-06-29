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
