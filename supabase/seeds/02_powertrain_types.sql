-- Seed powertrain types
INSERT INTO public.powertrain_types (name, slug, display_label, description, display_order)
VALUES
  ('Petrol', 'petrol', 'Petrol', 'Internal combustion — petrol fuel', 10),
  ('Diesel', 'diesel', 'Diesel', 'Internal combustion — diesel fuel', 20),
  ('Electric', 'electric', 'Electric (BEV)', 'Battery electric — no combustion engine', 30),
  ('Plug-in Hybrid', 'phev', 'Plug-in Hybrid (PHEV)', 'Electric motor + combustion, externally chargeable', 40),
  ('Full Hybrid', 'hev', 'Full Hybrid (HEV)', 'Electric assist, not externally chargeable', 50),
  ('Mild Hybrid', 'mhev', 'Mild Hybrid (MHEV)', 'Light electric assist on combustion engine', 60),
  ('CNG', 'cng', 'CNG', 'Compressed Natural Gas', 70),
  ('LPG', 'lpg', 'LPG', 'Liquefied Petroleum Gas', 80),
  ('Hydrogen', 'hydrogen', 'Hydrogen (FCEV)', 'Fuel cell electric vehicle', 90),
  ('Bi-Fuel (CNG/Petrol)', 'bi-fuel-cng', 'Bi-Fuel (CNG)', 'Combined CNG and Petrol system', 100),
  ('Bi-Fuel (LPG/Petrol)', 'bi-fuel-lpg', 'Bi-Fuel (LPG)', 'Combined LPG and Petrol system', 110)
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  display_label = EXCLUDED.display_label,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order;
