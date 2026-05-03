-- migration: 20240009_subcategory.sql

-- Add subcategories to vehicle_categories
ALTER TABLE public.vehicle_categories
  ADD COLUMN IF NOT EXISTS subcategories JSONB
  NOT NULL DEFAULT '[]';

UPDATE public.vehicle_categories
SET subcategories = '[
  {"slug":"motorcycle","label":"Motorcycle"},
  {"slug":"scooter","label":"Scooter"},
  {"slug":"moped","label":"Moped"},
  {"slug":"electric-bicycle","label":"Electric Bicycle"}
]'::jsonb
WHERE slug = 'two-wheeler';

UPDATE public.vehicle_categories
SET subcategories = '[
  {"slug":"passenger-autorickshaw",
   "label":"Passenger Auto-Rickshaw"},
  {"slug":"cargo-three-wheeler",
   "label":"Cargo Three-Wheeler"}
]'::jsonb
WHERE slug = 'three-wheeler';

UPDATE public.vehicle_categories
SET subcategories = '[
  {"slug":"hatchback","label":"Hatchback"},
  {"slug":"sedan","label":"Sedan"},
  {"slug":"suv","label":"SUV"},
  {"slug":"muv-mpv","label":"MUV / MPV"},
  {"slug":"crossover","label":"Crossover"},
  {"slug":"convertible","label":"Convertible"}
]'::jsonb
WHERE slug = 'passenger-car';

UPDATE public.vehicle_categories
SET subcategories = '[
  {"slug":"minivan","label":"Minivan"},
  {"slug":"mini-truck","label":"Mini Truck"},
  {"slug":"pickup-truck","label":"Pickup Truck"},
  {"slug":"cargo-van","label":"Cargo Van"},
  {"slug":"small-container-truck",
   "label":"Small Container Truck"},
  {"slug":"school-van","label":"School Van"},
  {"slug":"ambulance-special",
   "label":"Ambulance / Special Van"}
]'::jsonb
WHERE slug = 'lcv';

UPDATE public.vehicle_categories
SET name = 'Medium & Heavy Commercial Vehicle',
    slug = 'mhcv',
    subcategories = '[
  {"slug":"city-bus","label":"City Bus"},
  {"slug":"intercity-bus","label":"Intercity Bus"},
  {"slug":"school-bus","label":"School Bus"},
  {"slug":"rigid-truck","label":"Rigid Truck"},
  {"slug":"tipper","label":"Tipper"}
]'::jsonb
WHERE slug = 'hcv';

UPDATE public.vehicle_categories
SET subcategories = '[]'::jsonb
WHERE slug = 'construction-special';

-- Add subcategory to vehicle_models
ALTER TABLE public.vehicle_models
  ADD COLUMN IF NOT EXISTS subcategory TEXT;
