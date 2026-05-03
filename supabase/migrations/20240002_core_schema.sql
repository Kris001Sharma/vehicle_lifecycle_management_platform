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

-- Trigger for tenants
DROP TRIGGER IF EXISTS set_updated_at ON public.tenants;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tenants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

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

-- vehicle_models table
CREATE TABLE IF NOT EXISTS public.vehicle_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id)
    ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES public.vehicle_types(id)
    ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
  name TEXT NOT NULL,
  sku TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'discontinued', 'draft')),
  specs JSONB NOT NULL DEFAULT '{}',
  service_interval_km INT,
  service_interval_months INT,
  warranty_vehicle_yrs INT,
  warranty_battery_yrs INT,
  warranty_motor_yrs INT,
  launched_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for vehicle_variants
DROP TRIGGER IF EXISTS set_updated_at ON public.vehicle_variants;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.vehicle_variants
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

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

-- variant_default_features table
CREATE TABLE IF NOT EXISTS public.variant_default_features (
  variant_id UUID NOT NULL
    REFERENCES public.vehicle_variants(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL
    REFERENCES public.features(id) ON DELETE CASCADE,
  is_standard BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (variant_id, feature_id)
);

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
