-- seed: 02_powertrain_types.sql
INSERT INTO public.powertrain_types
  (name, slug, display_label, description, display_order)
VALUES
  ('Petrol', 'petrol', 'Petrol',
   'Internal combustion — petrol fuel', 1),
  ('Diesel', 'diesel', 'Diesel',
   'Internal combustion — diesel fuel', 2),
  ('Electric', 'electric', 'Electric (BEV)',
   'Battery electric — no combustion engine', 3),
  ('Plug-in Hybrid', 'phev', 'Plug-in Hybrid (PHEV)',
   'Electric motor + combustion, externally chargeable',
   4),
  ('Full Hybrid', 'hev', 'Full Hybrid (HEV)',
   'Electric assist, not externally chargeable', 5),
  ('Mild Hybrid', 'mhev', 'Mild Hybrid (MHEV)',
   'Light electric assist on combustion engine', 6),
  ('CNG', 'cng', 'CNG',
   'Compressed Natural Gas', 7),
  ('LPG', 'lpg', 'LPG',
   'Liquefied Petroleum Gas', 8),
  ('Hydrogen', 'hydrogen', 'Hydrogen (FCEV)',
   'Fuel cell electric vehicle', 9)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  display_label = EXCLUDED.display_label,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order;
