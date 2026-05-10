-- Ensure AMC columns exist on vehicles table
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS amc_years INT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS amc_package_id TEXT;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS has_amc BOOLEAN DEFAULT false;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS handover_ritual_completed BOOLEAN DEFAULT false;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS warranty_certificate_no TEXT;
