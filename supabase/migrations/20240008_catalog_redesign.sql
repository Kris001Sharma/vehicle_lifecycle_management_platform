-- migration: 20240008_catalog_redesign.sql

-- Step 1: Create vehicle_categories table
CREATE TABLE public.vehicle_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vehicle_categories
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_can_read_categories"
ON public.vehicle_categories FOR SELECT
TO authenticated USING (true);

-- Step 2: Create powertrain_types table
CREATE TABLE public.powertrain_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  display_label TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.powertrain_types
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_can_read_powertrain_types"
ON public.powertrain_types FOR SELECT
TO authenticated USING (true);

-- Step 3: Create tenant_catalog_config table
CREATE TABLE public.tenant_catalog_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE
    REFERENCES public.tenants(id) ON DELETE CASCADE,
  enabled_category_ids UUID[] NOT NULL DEFAULT '{}',
  enabled_powertrain_ids UUID[] NOT NULL DEFAULT '{}',
  regulatory_market TEXT NOT NULL DEFAULT 'IN',
  currency TEXT NOT NULL DEFAULT 'INR',
  default_service_interval_km INT,
  default_service_interval_months INT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_tenant_catalog_config_updated_at
  BEFORE UPDATE ON public.tenant_catalog_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.tenant_catalog_config
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_can_manage_catalog_config"
ON public.tenant_catalog_config FOR ALL
TO authenticated
USING (
  tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
  AND (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
)
WITH CHECK (
  tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
  AND (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "all_roles_can_read_catalog_config"
ON public.tenant_catalog_config FOR SELECT
TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

-- Step 4: Migrate vehicle_models
ALTER TABLE public.vehicle_models
  ADD COLUMN category_id UUID
    REFERENCES public.vehicle_categories(id)
    ON DELETE RESTRICT,
  ADD COLUMN use_type TEXT
    CHECK (use_type IN
      ('personal', 'commercial', 'both')),
  ADD COLUMN manufacturer TEXT,
  ADD COLUMN year_from INT,
  ADD COLUMN year_to INT;

-- Step 5: Migrate vehicle_variants
ALTER TABLE public.vehicle_variants
  ADD COLUMN powertrain_type_id UUID
    REFERENCES public.powertrain_types(id)
    ON DELETE RESTRICT,
  ADD COLUMN gvw_kg NUMERIC,
  ADD COLUMN seating_capacity INT,
  ADD COLUMN warranty_powertrain_yrs INT;

-- Step 6: Add indexes for new columns
CREATE INDEX idx_vehicle_models_category
  ON public.vehicle_models(category_id);
CREATE INDEX idx_vehicle_variants_powertrain
  ON public.vehicle_variants(powertrain_type_id);
CREATE INDEX idx_tenant_catalog_config_tenant
  ON public.tenant_catalog_config(tenant_id);
