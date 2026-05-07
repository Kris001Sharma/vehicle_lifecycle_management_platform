-- Update Achievement Policies to match app standards and be more robust
-- Also ensure users can read their own profiles to avoid RLS deadlocks

-- 1. Ensure users can always read their own profile (crucial for subqueries in other policies)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'users_can_read_own_profile') THEN
        CREATE POLICY "users_can_read_own_profile" ON public.user_profiles
          FOR SELECT TO authenticated
          USING (id = auth.uid());
    END IF;
END $$;

-- 2. Update achievement_milestones policies
DROP POLICY IF EXISTS "Tenants can manage their milestones" ON public.achievement_milestones;
DROP POLICY IF EXISTS "admin_can_manage_milestones" ON public.achievement_milestones;
DROP POLICY IF EXISTS "all_roles_can_read_milestones" ON public.achievement_milestones;

CREATE POLICY "admin_can_manage_milestones" ON public.achievement_milestones
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id() 
    OR tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id() 
    OR tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
  );

-- 3. Update tenant_achievement_config policies
DROP POLICY IF EXISTS "Tenants can manage their achievement config" ON public.tenant_achievement_config;
DROP POLICY IF EXISTS "admin_can_manage_achievement_config" ON public.tenant_achievement_config;
DROP POLICY IF EXISTS "all_roles_can_read_achievement_config" ON public.tenant_achievement_config;

CREATE POLICY "admin_can_manage_achievement_config" ON public.tenant_achievement_config
  FOR ALL TO authenticated
  USING (
    tenant_id = public.get_user_tenant_id() 
    OR tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    tenant_id = public.get_user_tenant_id() 
    OR tenant_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid())
  );
