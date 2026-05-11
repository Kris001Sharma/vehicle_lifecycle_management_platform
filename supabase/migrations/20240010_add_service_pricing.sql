-- Add pricing and AMC benefit tracking to service tables
ALTER TABLE public.service_parts ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE public.service_parts ADD COLUMN IF NOT EXISTS is_amc_benefit BOOLEAN DEFAULT false;

ALTER TABLE public.service_records ADD COLUMN IF NOT EXISTS total_parts_cost NUMERIC DEFAULT 0;
ALTER TABLE public.service_records ADD COLUMN IF NOT EXISTS labor_cost NUMERIC DEFAULT 0;
ALTER TABLE public.service_records ADD COLUMN IF NOT EXISTS total_cost NUMERIC DEFAULT 0;
ALTER TABLE public.service_records ADD COLUMN IF NOT EXISTS amc_discount_amount NUMERIC DEFAULT 0;
