-- Achievements and Milestones Schema
CREATE TABLE IF NOT EXISTS public.achievement_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sales_target INT NOT NULL DEFAULT 0,
  revenue_target NUMERIC NOT NULL DEFAULT 0,
  badge_icon TEXT NOT NULL DEFAULT 'Award',
  badge_color TEXT NOT NULL DEFAULT 'amber',
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Quote configuration
CREATE TABLE IF NOT EXISTS public.tenant_achievement_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  quote TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.achievement_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_achievement_config ENABLE ROW LEVEL SECURITY;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS set_updated_at ON public.achievement_milestones;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.achievement_milestones
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON public.tenant_achievement_config;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.tenant_achievement_config
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies
CREATE POLICY "Tenants can manage their milestones" 
  ON public.achievement_milestones
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

CREATE POLICY "Tenants can manage their achievement config" 
  ON public.tenant_achievement_config
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()));

-- Seed default milestones logic would go here if needed per tenant
