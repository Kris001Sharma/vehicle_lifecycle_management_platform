CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  archive_after_months INT NOT NULL DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Trigger for tenants
DROP TRIGGER IF EXISTS set_updated_at ON public.tenants;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- tenant_catalog_config table
CREATE TABLE IF NOT EXISTS public.tenant_catalog_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE
    REFERENCES public.tenants(id) ON DELETE CASCADE,
  enabled_category_ids UUID[] NOT NULL DEFAULT '{}',
  enabled_powertrain_ids UUID[] NOT NULL DEFAULT '{}',
  manufacturers TEXT[] NOT NULL DEFAULT '{}',
  regulatory_market TEXT NOT NULL DEFAULT 'IN',
  currency TEXT NOT NULL DEFAULT 'INR',
  finance_tracking_enabled BOOLEAN NOT NULL DEFAULT false,
  default_service_interval_km INT,
  default_service_interval_months INT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.tenant_catalog_config ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_tenant_catalog_config_updated_at ON public.tenant_catalog_config;
CREATE TRIGGER set_tenant_catalog_config_updated_at
  BEFORE UPDATE ON public.tenant_catalog_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- powertrain_types table
CREATE TABLE IF NOT EXISTS public.powertrain_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_label TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.powertrain_types ENABLE ROW LEVEL SECURITY;

-- vehicle_categories table
CREATE TABLE IF NOT EXISTS public.vehicle_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  subcategories JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vehicle_categories ENABLE ROW LEVEL SECURITY;

-- vehicle_types table
CREATE TABLE IF NOT EXISTS public.vehicle_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id)
    ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, slug)
);

ALTER TABLE public.vehicle_types ENABLE ROW LEVEL SECURITY;

-- vehicle_models table
CREATE TABLE IF NOT EXISTS public.vehicle_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id)
    ON DELETE CASCADE,
  type_id UUID REFERENCES public.vehicle_types(id)
    ON DELETE CASCADE,
  category_id UUID REFERENCES public.vehicle_categories(id)
    ON DELETE RESTRICT,
  subcategory TEXT,
  name TEXT NOT NULL,
  manufacturer TEXT,
  year_from INT,
  year_to INT,
  use_type TEXT CHECK (use_type IN ('personal', 'commercial', 'both')),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vehicle_models ENABLE ROW LEVEL SECURITY;


-- Trigger for vehicle_models
DROP TRIGGER IF EXISTS set_updated_at ON public.vehicle_models;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.vehicle_models
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- vehicle_variants table
CREATE TABLE IF NOT EXISTS public.vehicle_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id)
    ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES public.vehicle_models(id)
    ON DELETE CASCADE,
  powertrain_type_id UUID REFERENCES public.powertrain_types(id)
    ON DELETE RESTRICT,
  name TEXT NOT NULL,
  sku TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'discontinued', 'draft')),
  availability_status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (availability_status IN ('PRE_ORDER_ONLY', 'ACTIVE', 'DISCONTINUED')),
  specs JSONB NOT NULL DEFAULT '{}',
  service_interval_km INT,
  service_interval_months INT,
  gvw_kg NUMERIC,
  seating_capacity INT,
  warranty_vehicle_yrs INT,
  warranty_powertrain_yrs INT,
  warranty_battery_yrs INT,
  warranty_motor_yrs INT,
  launched_at DATE,
  price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Catch-up for existing vehicle_variants table
ALTER TABLE public.vehicle_variants 
  ADD COLUMN IF NOT EXISTS powertrain_type_id UUID REFERENCES public.powertrain_types(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS availability_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (availability_status IN ('PRE_ORDER_ONLY', 'ACTIVE', 'DISCONTINUED')),
  ADD COLUMN IF NOT EXISTS gvw_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS seating_capacity INT,
  ADD COLUMN IF NOT EXISTS warranty_powertrain_yrs INT;

-- Catch-up for existing vehicle_models table
ALTER TABLE public.vehicle_models
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.vehicle_categories(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS manufacturer TEXT,
  ADD COLUMN IF NOT EXISTS year_from INT,
  ADD COLUMN IF NOT EXISTS year_to INT,
  ADD COLUMN IF NOT EXISTS use_type TEXT CHECK (use_type IN ('personal', 'commercial', 'both'));

-- Trigger for vehicle_variants
DROP TRIGGER IF EXISTS set_updated_at ON public.vehicle_variants;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.vehicle_variants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.vehicle_variants ENABLE ROW LEVEL SECURITY;

-- features table
CREATE TABLE IF NOT EXISTS public.features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id)
    ON DELETE CASCADE,
  vehicle_type_id UUID REFERENCES public.vehicle_types(id)
    ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  is_default_standard BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;

-- variant_default_features table
CREATE TABLE IF NOT EXISTS public.variant_default_features (
  variant_id UUID NOT NULL
    REFERENCES public.vehicle_variants(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL
    REFERENCES public.features(id) ON DELETE CASCADE,
  is_standard BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (variant_id, feature_id)
);

ALTER TABLE public.variant_default_features ENABLE ROW LEVEL SECURITY;

-- customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id)
    ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT,
  city TEXT,
  customer_type TEXT NOT NULL
    CHECK (customer_type IN
      ('individual', 'fleet_owner', 'school', 'transporter')),
  fleet_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Trigger for customers
DROP TRIGGER IF EXISTS set_updated_at ON public.customers;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id)
    ON DELETE CASCADE,
  variant_id UUID NOT NULL
    REFERENCES public.vehicle_variants(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL
    REFERENCES public.customers(id) ON DELETE RESTRICT,
  vehicle_number TEXT NOT NULL,
  chassis_number TEXT,
  registration_plate TEXT,
  sale_date DATE NOT NULL,
  sale_notes TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'transferred', 'retired')),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  archive_key TEXT,
  archived_at TIMESTAMPTZ,
  last_service_date DATE,
  total_service_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, vehicle_number)
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Trigger for vehicles
DROP TRIGGER IF EXISTS set_updated_at ON public.vehicles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- vehicle_features table
CREATE TABLE IF NOT EXISTS public.vehicle_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id)
    ON DELETE CASCADE,
  vehicle_id UUID NOT NULL
    REFERENCES public.vehicles(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL
    REFERENCES public.features(id) ON DELETE RESTRICT,
  is_standard BOOLEAN NOT NULL DEFAULT false,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vehicle_features ENABLE ROW LEVEL SECURITY;

-- vehicle_ownership_history table
CREATE TABLE IF NOT EXISTS public.vehicle_ownership_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id)
    ON DELETE CASCADE,
  vehicle_id UUID NOT NULL
    REFERENCES public.vehicles(id) ON DELETE CASCADE,
  from_customer_id UUID NOT NULL
    REFERENCES public.customers(id) ON DELETE RESTRICT,
  to_customer_id UUID NOT NULL
    REFERENCES public.customers(id) ON DELETE RESTRICT,
  transferred_at DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vehicle_ownership_history ENABLE ROW LEVEL SECURITY;

-- service_records table
CREATE TABLE IF NOT EXISTS public.service_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id)
    ON DELETE CASCADE,
  vehicle_id UUID NOT NULL
    REFERENCES public.vehicles(id) ON DELETE CASCADE,
  visit_date DATE NOT NULL,
  mileage_at_visit INT,
  visit_type TEXT NOT NULL
    CHECK (visit_type IN
      ('routine', 'repair', 'inspection', 'warranty')),
  complaint TEXT,
  diagnosis TEXT,
  work_done TEXT,
  technician_name TEXT,
  next_service_km INT,
  next_service_date DATE,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.service_records ENABLE ROW LEVEL SECURITY;

-- Trigger for service_records
DROP TRIGGER IF EXISTS set_updated_at ON public.service_records;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.service_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- Auto-calculate next service and update vehicle denormalized fields
CREATE OR REPLACE FUNCTION public.handle_service_record_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_interval_km INT;
  v_interval_months INT;
BEGIN
  SELECT vv.service_interval_km, vv.service_interval_months
  INTO v_interval_km, v_interval_months
  FROM public.vehicles v
  JOIN public.vehicle_variants vv ON vv.id = v.variant_id
  WHERE v.id = NEW.vehicle_id;

  IF NEW.next_service_km IS NULL AND v_interval_km IS NOT NULL
    AND NEW.mileage_at_visit IS NOT NULL THEN
    NEW.next_service_km := NEW.mileage_at_visit + v_interval_km;
  END IF;

  IF NEW.next_service_date IS NULL
    AND v_interval_months IS NOT NULL THEN
    NEW.next_service_date :=
      NEW.visit_date + (v_interval_months || ' months')::INTERVAL;
  END IF;

  UPDATE public.vehicles SET
    last_service_date = NEW.visit_date,
    total_service_count = total_service_count + 1,
    updated_at = NOW()
  WHERE id = NEW.vehicle_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for on_service_record_insert
DROP TRIGGER IF EXISTS on_service_record_insert ON public.service_records;
CREATE TRIGGER on_service_record_insert
  BEFORE INSERT ON public.service_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_service_record_insert();

-- service_parts table
CREATE TABLE IF NOT EXISTS public.service_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id)
    ON DELETE CASCADE,
  service_record_id UUID NOT NULL
    REFERENCES public.service_records(id) ON DELETE CASCADE,
  part_category TEXT NOT NULL,
  part_name TEXT NOT NULL,
  action TEXT NOT NULL
    CHECK (action IN
      ('replaced', 'repaired', 'inspected', 'adjusted')),
  quantity INT NOT NULL DEFAULT 1,
  notes TEXT
);

ALTER TABLE public.service_parts ENABLE ROW LEVEL SECURITY;

-- attachments table
CREATE TABLE IF NOT EXISTS public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id)
    ON DELETE CASCADE,
  entity_type TEXT NOT NULL
    CHECK (entity_type IN
      ('service_record', 'vehicle', 'customer')),
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_key TEXT,
  storage_provider TEXT NOT NULL
    CHECK (storage_provider IN ('r2', 'cloudinary')),
  cloudinary_public_id TEXT,
  file_type TEXT NOT NULL,
  file_size_bytes INT,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- inventory_units table
CREATE TABLE IF NOT EXISTS public.inventory_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL
    REFERENCES public.tenants(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL
    REFERENCES public.vehicle_variants(id)
    ON DELETE RESTRICT,
  chassis_number TEXT,
  colour TEXT,
  condition TEXT NOT NULL DEFAULT 'new'
    CHECK (condition IN ('new','demo','refurbished')),
  status TEXT NOT NULL DEFAULT 'in_stock'
    CHECK (status IN
      ('in_stock','reserved','sold','demo','written_off')),
  received_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id)
    ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.inventory_units ENABLE ROW LEVEL SECURITY;

-- Trigger for inventory_units
DROP TRIGGER IF EXISTS set_updated_at ON public.inventory_units;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.inventory_units
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- pre_bookings table
CREATE TABLE IF NOT EXISTS public.pre_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL
    REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL
    REFERENCES public.customers(id) ON DELETE RESTRICT,
  variant_id UUID NOT NULL
    REFERENCES public.vehicle_variants(id)
    ON DELETE RESTRICT,
  inventory_unit_id UUID
    REFERENCES public.inventory_units(id)
    ON DELETE SET NULL,
  vehicle_id UUID
    REFERENCES public.vehicles(id) ON DELETE SET NULL,
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date DATE,
  status TEXT NOT NULL DEFAULT 'enquiry'
    CHECK (status IN (
      'enquiry','confirmed','ordered',
      'in_transit','delivered','cancelled'
    )),
  colour_preference TEXT,
  special_requirements TEXT,
  cancellation_reason TEXT,
  deposit_received BOOLEAN NOT NULL DEFAULT false,
  deposit_amount NUMERIC,
  finance_type TEXT
    CHECK (finance_type IN (
      'cash','bank_loan','in_house','leasing'
    )),
  finance_company TEXT,
  loan_reference TEXT,
  monthly_instalment NUMERIC,
  created_by UUID REFERENCES auth.users(id)
    ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id)
    ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pre_bookings ENABLE ROW LEVEL SECURITY;

-- Trigger for pre_bookings
DROP TRIGGER IF EXISTS set_updated_at ON public.pre_bookings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.pre_bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- customer_communications table
CREATE TABLE IF NOT EXISTS public.customer_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL
    REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL
    REFERENCES public.customers(id) ON DELETE CASCADE,
  pre_booking_id UUID
    REFERENCES public.pre_bookings(id) ON DELETE SET NULL,
  log_type TEXT NOT NULL
    CHECK (log_type IN ('activity','followup')),
  interaction_type TEXT NOT NULL
    CHECK (interaction_type IN (
      'phone_call','whatsapp','email',
      'site_visit','in_person','other'
    )),
  direction TEXT
    CHECK (direction IN ('inbound','outbound')),
  notes TEXT NOT NULL,
  outcome TEXT
    CHECK (outcome IN (
      'follow_up_scheduled','quotation_sent',
      'awaiting_decision','booking_confirmed',
      'no_further_action','other'
    )),
  follow_up_date DATE,
  follow_up_done BOOLEAN NOT NULL DEFAULT false,
  logged_by UUID REFERENCES auth.users(id)
    ON DELETE SET NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customer_communications ENABLE ROW LEVEL SECURITY;

-- audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN
    ('INSERT', 'UPDATE', 'DELETE', 'SELECT')),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- error_logs table
-- (already enabled in 20240001)


-- login_attempts table
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time
  ON public.login_attempts(email, attempted_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time
  ON public.login_attempts(ip_address, attempted_at);

-- login rate limit function
CREATE OR REPLACE FUNCTION public.check_login_rate(
  p_email TEXT,
  p_ip TEXT
) RETURNS TABLE(
  is_locked_email BOOLEAN,
  is_locked_ip BOOLEAN,
  attempts_remaining INT
) AS $$
DECLARE
  v_email_attempts INT;
  v_ip_attempts INT;
  v_limit INT := 5;
  v_window INTERVAL := '15 minutes';
BEGIN
  SELECT COUNT(*) INTO v_email_attempts
  FROM public.login_attempts
  WHERE email = p_email
    AND success = false
    AND attempted_at > NOW() - v_window;

  SELECT COUNT(*) INTO v_ip_attempts
  FROM public.login_attempts
  WHERE ip_address = p_ip
    AND success = false
    AND attempted_at > NOW() - v_window;

  RETURN QUERY SELECT
    v_email_attempts >= v_limit,
    v_ip_attempts >= (v_limit * 3),
    GREATEST(0, v_limit - v_email_attempts);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Optional: Cleanup job using pg_cron
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
  END IF;
  
  -- Use PERFORM to schedule if cron is available
  PERFORM cron.schedule('cleanup-login-attempts', '0 0 * * *', 'DELETE FROM public.login_attempts WHERE attempted_at < NOW() - INTERVAL ''24 hours''');
EXCEPTION
  WHEN OTHERS THEN
    -- Ignore if pg_cron is not available
END $$;

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
  subcategories = EXCLUDED.subcategories,
  display_order = EXCLUDED.display_order;

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

