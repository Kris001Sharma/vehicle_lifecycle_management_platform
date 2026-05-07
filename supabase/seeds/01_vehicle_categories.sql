-- Seed vehicle categories
INSERT INTO public.vehicle_categories (name, slug, description, display_order, subcategories)
VALUES 
  ('Two-Wheeler', 'two-wheeler', 'Bicycles, scooters, and motorcycles', 10, '[
    {"slug":"motorcycle","label":"Motorcycle"},
    {"slug":"scooter","label":"Scooter"},
    {"slug":"moped","label":"Moped"},
    {"slug":"electric-bicycle","label":"Electric Bicycle"}
  ]'::jsonb),
  ('Three-Wheeler', 'three-wheeler', 'Auto-rickshaws and cargo loaders', 20, '[
    {"slug":"passenger-autorickshaw", "label":"Passenger Auto-Rickshaw"},
    {"slug":"cargo-three-wheeler", "label":"Cargo Three-Wheeler"}
  ]'::jsonb),
  ('Passenger Car', 'passenger-car', 'Personal and taxi passenger vehicles', 30, '[
    {"slug":"hatchback","label":"Hatchback"},
    {"slug":"sedan","label":"Sedan"},
    {"slug":"suv","label":"SUV"},
    {"slug":"muv-mpv","label":"MUV / MPV"},
    {"slug":"crossover","label":"Crossover"},
    {"slug":"convertible","label":"Convertible"}
  ]'::jsonb),
  ('Light Commercial Vehicle', 'lcv', 'Vans, pickups, and small trucks', 40, '[
    {"slug":"minivan","label":"Minivan"},
    {"slug":"mini-truck","label":"Mini Truck"},
    {"slug":"pickup-truck","label":"Pickup Truck"},
    {"slug":"cargo-van","label":"Cargo Van"},
    {"slug":"small-container-truck", "label":"Small Container Truck"},
    {"slug":"school-van","label":"School Van"},
    {"slug":"ambulance-special", "label":"Ambulance / Special Van"}
  ]'::jsonb),
  ('Heavy Commercial Vehicle', 'hcv', 'Large trucks, tippers, and tankers', 50, '[
    {"slug":"rigid-truck","label":"Rigid Truck"},
    {"slug":"tipper","label":"Tipper"},
    {"slug":"tanker","label":"Tanker"},
    {"slug":"trailer-truck","label":"Trailer Truck"}
  ]'::jsonb),
  ('Construction & Special Purpose', 'construction-special', 'Earthmoving and specialized machinery', 60, '[
    {"slug":"excavator","label":"Excavator"},
    {"slug":"loader","label":"Loader"},
    {"slug":"backhoe","label":"Backhoe"}
  ]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subcategories = EXCLUDED.subcategories;
