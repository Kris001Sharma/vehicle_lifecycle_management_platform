-- seed: 01_vehicle_categories.sql
INSERT INTO public.vehicle_categories
  (name, slug, description, display_order)
VALUES
  ('Two-Wheeler', 'two-wheeler',
   'Motorcycles, scooters, mopeds, e-bikes', 1),
  ('Three-Wheeler', 'three-wheeler',
   'Auto-rickshaws, cargo three-wheelers', 2),
  ('Passenger Car', 'passenger-car',
   'Hatchbacks, sedans, SUVs, MUVs, MPVs', 3),
  ('Light Commercial Vehicle', 'lcv',
   'Pickups, small vans, mini trucks, minibuses', 4),
  ('Heavy Commercial Vehicle', 'hcv',
   'Trucks, buses, tippers, tankers', 5),
  ('Construction & Special Purpose',
   'construction-special',
   'Excavators, loaders, agricultural vehicles', 6)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order;
