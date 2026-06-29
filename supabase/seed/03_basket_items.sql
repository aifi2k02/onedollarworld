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
