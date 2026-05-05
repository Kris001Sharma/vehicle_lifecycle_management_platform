-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role', ''
  );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
  SELECT (
    auth.jwt() -> 'app_metadata' ->> 'tenant_id'
  )::UUID;
$$ LANGUAGE SQL STABLE;

-- Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_default_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_ownership_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


-- 1. tenants
DROP POLICY IF EXISTS "admin_can_select_tenants" ON public.tenants;
CREATE POLICY "admin_can_select_tenants" ON public.tenants
  FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin' AND id = public.get_user_tenant_id());


-- 2. vehicle_types
DROP POLICY IF EXISTS "admin_can_select_vehicle_types" ON public.vehicle_types;
DROP POLICY IF EXISTS "admin_can_insert_vehicle_types" ON public.vehicle_types;
DROP POLICY IF EXISTS "admin_can_update_vehicle_types" ON public.vehicle_types;
DROP POLICY IF EXISTS "admin_can_delete_vehicle_types" ON public.vehicle_types;
DROP POLICY IF EXISTS "sales_can_select_vehicle_types" ON public.vehicle_types;
DROP POLICY IF EXISTS "service_can_select_vehicle_types" ON public.vehicle_types;

CREATE POLICY "admin_can_select_vehicle_types" ON public.vehicle_types FOR SELECT TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_insert_vehicle_types" ON public.vehicle_types FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_update_vehicle_types" ON public.vehicle_types FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_delete_vehicle_types" ON public.vehicle_types FOR DELETE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "sales_can_select_vehicle_types" ON public.vehicle_types FOR SELECT TO authenticated USING (public.get_user_role() = 'sales' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "service_can_select_vehicle_types" ON public.vehicle_types FOR SELECT TO authenticated USING (public.get_user_role() = 'service' AND tenant_id = public.get_user_tenant_id());


-- 3. vehicle_models
DROP POLICY IF EXISTS "admin_can_select_vehicle_models" ON public.vehicle_models;
DROP POLICY IF EXISTS "admin_can_insert_vehicle_models" ON public.vehicle_models;
DROP POLICY IF EXISTS "admin_can_update_vehicle_models" ON public.vehicle_models;
DROP POLICY IF EXISTS "admin_can_delete_vehicle_models" ON public.vehicle_models;
DROP POLICY IF EXISTS "sales_can_select_vehicle_models" ON public.vehicle_models;
DROP POLICY IF EXISTS "service_can_select_vehicle_models" ON public.vehicle_models;

CREATE POLICY "admin_can_select_vehicle_models" ON public.vehicle_models FOR SELECT TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_insert_vehicle_models" ON public.vehicle_models FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_update_vehicle_models" ON public.vehicle_models FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_delete_vehicle_models" ON public.vehicle_models FOR DELETE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "sales_can_select_vehicle_models" ON public.vehicle_models FOR SELECT TO authenticated USING (public.get_user_role() = 'sales' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "service_can_select_vehicle_models" ON public.vehicle_models FOR SELECT TO authenticated USING (public.get_user_role() = 'service' AND tenant_id = public.get_user_tenant_id());


-- 4. vehicle_variants
DROP POLICY IF EXISTS "admin_can_select_vehicle_variants" ON public.vehicle_variants;
DROP POLICY IF EXISTS "admin_can_insert_vehicle_variants" ON public.vehicle_variants;
DROP POLICY IF EXISTS "admin_can_update_vehicle_variants" ON public.vehicle_variants;
DROP POLICY IF EXISTS "admin_can_delete_vehicle_variants" ON public.vehicle_variants;
DROP POLICY IF EXISTS "sales_can_select_vehicle_variants" ON public.vehicle_variants;
DROP POLICY IF EXISTS "service_can_select_vehicle_variants" ON public.vehicle_variants;

CREATE POLICY "admin_can_select_vehicle_variants" ON public.vehicle_variants FOR SELECT TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_insert_vehicle_variants" ON public.vehicle_variants FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_update_vehicle_variants" ON public.vehicle_variants FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_delete_vehicle_variants" ON public.vehicle_variants FOR DELETE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "sales_can_select_vehicle_variants" ON public.vehicle_variants FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());
CREATE POLICY "service_can_select_vehicle_variants" ON public.vehicle_variants FOR SELECT TO authenticated USING (tenant_id = public.get_user_tenant_id());


-- 5. features
DROP POLICY IF EXISTS "admin_can_select_features" ON public.features;
DROP POLICY IF EXISTS "admin_can_insert_features" ON public.features;
DROP POLICY IF EXISTS "admin_can_update_features" ON public.features;
DROP POLICY IF EXISTS "admin_can_delete_features" ON public.features;
DROP POLICY IF EXISTS "sales_can_select_features" ON public.features;
DROP POLICY IF EXISTS "service_can_select_features" ON public.features;

CREATE POLICY "admin_can_select_features" ON public.features FOR SELECT TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_insert_features" ON public.features FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_update_features" ON public.features FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_delete_features" ON public.features FOR DELETE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "sales_can_select_features" ON public.features FOR SELECT TO authenticated USING (public.get_user_role() = 'sales' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "service_can_select_features" ON public.features FOR SELECT TO authenticated USING (public.get_user_role() = 'service' AND tenant_id = public.get_user_tenant_id());


-- 6. variant_default_features
DROP POLICY IF EXISTS "admin_can_select_variant_default_features" ON public.variant_default_features;
DROP POLICY IF EXISTS "admin_can_insert_variant_default_features" ON public.variant_default_features;
DROP POLICY IF EXISTS "admin_can_update_variant_default_features" ON public.variant_default_features;
DROP POLICY IF EXISTS "admin_can_delete_variant_default_features" ON public.variant_default_features;
DROP POLICY IF EXISTS "sales_can_select_variant_default_features" ON public.variant_default_features;
DROP POLICY IF EXISTS "service_can_select_variant_default_features" ON public.variant_default_features;

CREATE POLICY "admin_can_select_variant_default_features" ON public.variant_default_features FOR SELECT TO authenticated
  USING (public.get_user_role() = 'admin' AND EXISTS (SELECT 1 FROM public.vehicle_variants vv WHERE vv.id = variant_id AND vv.tenant_id = public.get_user_tenant_id()));
CREATE POLICY "admin_can_insert_variant_default_features" ON public.variant_default_features FOR INSERT TO authenticated
  WITH CHECK (public.get_user_role() = 'admin' AND EXISTS (SELECT 1 FROM public.vehicle_variants vv WHERE vv.id = variant_id AND vv.tenant_id = public.get_user_tenant_id()));
CREATE POLICY "admin_can_update_variant_default_features" ON public.variant_default_features FOR UPDATE TO authenticated
  USING (public.get_user_role() = 'admin' AND EXISTS (SELECT 1 FROM public.vehicle_variants vv WHERE vv.id = variant_id AND vv.tenant_id = public.get_user_tenant_id()));
CREATE POLICY "admin_can_delete_variant_default_features" ON public.variant_default_features FOR DELETE TO authenticated
  USING (public.get_user_role() = 'admin' AND EXISTS (SELECT 1 FROM public.vehicle_variants vv WHERE vv.id = variant_id AND vv.tenant_id = public.get_user_tenant_id()));
CREATE POLICY "sales_can_select_variant_default_features" ON public.variant_default_features FOR SELECT TO authenticated
  USING (public.get_user_role() = 'sales' AND EXISTS (SELECT 1 FROM public.vehicle_variants vv WHERE vv.id = variant_id AND vv.tenant_id = public.get_user_tenant_id()));
CREATE POLICY "service_can_select_variant_default_features" ON public.variant_default_features FOR SELECT TO authenticated
  USING (public.get_user_role() = 'service' AND EXISTS (SELECT 1 FROM public.vehicle_variants vv WHERE vv.id = variant_id AND vv.tenant_id = public.get_user_tenant_id()));


-- 7. customers
DROP POLICY IF EXISTS "admin_can_select_customers" ON public.customers;
DROP POLICY IF EXISTS "admin_can_insert_customers" ON public.customers;
DROP POLICY IF EXISTS "admin_can_update_customers" ON public.customers;
DROP POLICY IF EXISTS "admin_can_delete_customers" ON public.customers;
DROP POLICY IF EXISTS "sales_can_select_customers" ON public.customers;
DROP POLICY IF EXISTS "sales_can_insert_customers" ON public.customers;
DROP POLICY IF EXISTS "sales_can_update_customers" ON public.customers;
DROP POLICY IF EXISTS "sales_can_delete_customers" ON public.customers;
DROP POLICY IF EXISTS "service_can_select_customers" ON public.customers;

CREATE POLICY "admin_can_select_customers" ON public.customers FOR SELECT TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_insert_customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_update_customers" ON public.customers FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_delete_customers" ON public.customers FOR DELETE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "sales_can_select_customers" ON public.customers FOR SELECT TO authenticated USING (public.get_user_role() = 'sales' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "sales_can_insert_customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'sales' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "sales_can_update_customers" ON public.customers FOR UPDATE TO authenticated USING (public.get_user_role() = 'sales' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "sales_can_delete_customers" ON public.customers FOR DELETE TO authenticated USING (public.get_user_role() = 'sales' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "service_can_select_customers" ON public.customers FOR SELECT TO authenticated USING (public.get_user_role() = 'service' AND tenant_id = public.get_user_tenant_id());


-- 8. vehicles
DROP POLICY IF EXISTS "admin_can_select_vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "admin_can_insert_vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "admin_can_update_vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "admin_can_delete_vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "sales_can_select_vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "sales_can_insert_vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "sales_can_update_vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "sales_can_delete_vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "service_can_select_vehicles" ON public.vehicles;

CREATE POLICY "admin_can_select_vehicles" ON public.vehicles FOR SELECT TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_insert_vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_update_vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_delete_vehicles" ON public.vehicles FOR DELETE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "sales_can_select_vehicles" ON public.vehicles FOR SELECT TO authenticated USING (public.get_user_role() = 'sales' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "sales_can_insert_vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'sales' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "sales_can_update_vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (public.get_user_role() = 'sales' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "sales_can_delete_vehicles" ON public.vehicles FOR DELETE TO authenticated USING (public.get_user_role() = 'sales' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "service_can_select_vehicles" ON public.vehicles FOR SELECT TO authenticated USING (public.get_user_role() = 'service' AND tenant_id = public.get_user_tenant_id());


-- 9. vehicle_features
DROP POLICY IF EXISTS "admin_can_select_vehicle_features" ON public.vehicle_features;
DROP POLICY IF EXISTS "admin_can_insert_vehicle_features" ON public.vehicle_features;
DROP POLICY IF EXISTS "admin_can_update_vehicle_features" ON public.vehicle_features;
DROP POLICY IF EXISTS "admin_can_delete_vehicle_features" ON public.vehicle_features;
DROP POLICY IF EXISTS "sales_can_select_vehicle_features" ON public.vehicle_features;
DROP POLICY IF EXISTS "sales_can_insert_vehicle_features" ON public.vehicle_features;
DROP POLICY IF EXISTS "sales_can_update_vehicle_features" ON public.vehicle_features;
DROP POLICY IF EXISTS "sales_can_delete_vehicle_features" ON public.vehicle_features;
DROP POLICY IF EXISTS "service_can_select_vehicle_features" ON public.vehicle_features;

CREATE POLICY "admin_can_select_vehicle_features" ON public.vehicle_features FOR SELECT TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_insert_vehicle_features" ON public.vehicle_features FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_update_vehicle_features" ON public.vehicle_features FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_delete_vehicle_features" ON public.vehicle_features FOR DELETE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "sales_can_select_vehicle_features" ON public.vehicle_features FOR SELECT TO authenticated USING (public.get_user_role() = 'sales' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "sales_can_insert_vehicle_features" ON public.vehicle_features FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'sales' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "sales_can_update_vehicle_features" ON public.vehicle_features FOR UPDATE TO authenticated USING (public.get_user_role() = 'sales' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "sales_can_delete_vehicle_features" ON public.vehicle_features FOR DELETE TO authenticated USING (public.get_user_role() = 'sales' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "service_can_select_vehicle_features" ON public.vehicle_features FOR SELECT TO authenticated USING (public.get_user_role() = 'service' AND tenant_id = public.get_user_tenant_id());


-- 10. vehicle_ownership_history
DROP POLICY IF EXISTS "admin_can_select_vehicle_ownership_history" ON public.vehicle_ownership_history;
DROP POLICY IF EXISTS "admin_can_insert_vehicle_ownership_history" ON public.vehicle_ownership_history;
DROP POLICY IF EXISTS "admin_can_update_vehicle_ownership_history" ON public.vehicle_ownership_history;
DROP POLICY IF EXISTS "admin_can_delete_vehicle_ownership_history" ON public.vehicle_ownership_history;
DROP POLICY IF EXISTS "sales_can_select_vehicle_ownership_history" ON public.vehicle_ownership_history;
DROP POLICY IF EXISTS "sales_can_insert_vehicle_ownership_history" ON public.vehicle_ownership_history;
DROP POLICY IF EXISTS "sales_can_update_vehicle_ownership_history" ON public.vehicle_ownership_history;
DROP POLICY IF EXISTS "sales_can_delete_vehicle_ownership_history" ON public.vehicle_ownership_history;

CREATE POLICY "admin_can_select_vehicle_ownership_history" ON public.vehicle_ownership_history FOR SELECT TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_insert_vehicle_ownership_history" ON public.vehicle_ownership_history FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_update_vehicle_ownership_history" ON public.vehicle_ownership_history FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_delete_vehicle_ownership_history" ON public.vehicle_ownership_history FOR DELETE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "sales_can_select_vehicle_ownership_history" ON public.vehicle_ownership_history FOR SELECT TO authenticated USING (public.get_user_role() = 'sales' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "sales_can_insert_vehicle_ownership_history" ON public.vehicle_ownership_history FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'sales' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "sales_can_update_vehicle_ownership_history" ON public.vehicle_ownership_history FOR UPDATE TO authenticated USING (public.get_user_role() = 'sales' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "sales_can_delete_vehicle_ownership_history" ON public.vehicle_ownership_history FOR DELETE TO authenticated USING (public.get_user_role() = 'sales' AND tenant_id = public.get_user_tenant_id());


-- 11. service_records
DROP POLICY IF EXISTS "admin_can_select_service_records" ON public.service_records;
DROP POLICY IF EXISTS "admin_can_insert_service_records" ON public.service_records;
DROP POLICY IF EXISTS "admin_can_update_service_records" ON public.service_records;
DROP POLICY IF EXISTS "admin_can_delete_service_records" ON public.service_records;
DROP POLICY IF EXISTS "service_can_select_service_records" ON public.service_records;
DROP POLICY IF EXISTS "service_can_insert_service_records" ON public.service_records;
DROP POLICY IF EXISTS "service_can_update_service_records" ON public.service_records;
DROP POLICY IF EXISTS "service_can_delete_service_records" ON public.service_records;

CREATE POLICY "admin_can_select_service_records" ON public.service_records FOR SELECT TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_insert_service_records" ON public.service_records FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_update_service_records" ON public.service_records FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_delete_service_records" ON public.service_records FOR DELETE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "service_can_select_service_records" ON public.service_records FOR SELECT TO authenticated USING (public.get_user_role() = 'service' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "service_can_insert_service_records" ON public.service_records FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'service' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "service_can_update_service_records" ON public.service_records FOR UPDATE TO authenticated USING (public.get_user_role() = 'service' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "service_can_delete_service_records" ON public.service_records FOR DELETE TO authenticated USING (public.get_user_role() = 'service' AND tenant_id = public.get_user_tenant_id());


-- 12. service_parts
DROP POLICY IF EXISTS "admin_can_select_service_parts" ON public.service_parts;
DROP POLICY IF EXISTS "admin_can_insert_service_parts" ON public.service_parts;
DROP POLICY IF EXISTS "admin_can_update_service_parts" ON public.service_parts;
DROP POLICY IF EXISTS "admin_can_delete_service_parts" ON public.service_parts;
DROP POLICY IF EXISTS "service_can_select_service_parts" ON public.service_parts;
DROP POLICY IF EXISTS "service_can_insert_service_parts" ON public.service_parts;
DROP POLICY IF EXISTS "service_can_update_service_parts" ON public.service_parts;
DROP POLICY IF EXISTS "service_can_delete_service_parts" ON public.service_parts;

CREATE POLICY "admin_can_select_service_parts" ON public.service_parts FOR SELECT TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_insert_service_parts" ON public.service_parts FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_update_service_parts" ON public.service_parts FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_delete_service_parts" ON public.service_parts FOR DELETE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "service_can_select_service_parts" ON public.service_parts FOR SELECT TO authenticated USING (public.get_user_role() = 'service' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "service_can_insert_service_parts" ON public.service_parts FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'service' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "service_can_update_service_parts" ON public.service_parts FOR UPDATE TO authenticated USING (public.get_user_role() = 'service' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "service_can_delete_service_parts" ON public.service_parts FOR DELETE TO authenticated USING (public.get_user_role() = 'service' AND tenant_id = public.get_user_tenant_id());


-- 13. attachments
DROP POLICY IF EXISTS "admin_can_select_attachments" ON public.attachments;
DROP POLICY IF EXISTS "admin_can_insert_attachments" ON public.attachments;
DROP POLICY IF EXISTS "admin_can_update_attachments" ON public.attachments;
DROP POLICY IF EXISTS "admin_can_delete_attachments" ON public.attachments;
DROP POLICY IF EXISTS "service_can_select_attachments" ON public.attachments;
DROP POLICY IF EXISTS "service_can_insert_attachments" ON public.attachments;
DROP POLICY IF EXISTS "service_can_update_attachments" ON public.attachments;
DROP POLICY IF EXISTS "service_can_delete_attachments" ON public.attachments;

CREATE POLICY "admin_can_select_attachments" ON public.attachments FOR SELECT TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_insert_attachments" ON public.attachments FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_update_attachments" ON public.attachments FOR UPDATE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "admin_can_delete_attachments" ON public.attachments FOR DELETE TO authenticated USING (public.get_user_role() = 'admin' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "service_can_select_attachments" ON public.attachments FOR SELECT TO authenticated USING (public.get_user_role() = 'service' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "service_can_insert_attachments" ON public.attachments FOR INSERT TO authenticated WITH CHECK (public.get_user_role() = 'service' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "service_can_update_attachments" ON public.attachments FOR UPDATE TO authenticated USING (public.get_user_role() = 'service' AND tenant_id = public.get_user_tenant_id());
CREATE POLICY "service_can_delete_attachments" ON public.attachments FOR DELETE TO authenticated USING (public.get_user_role() = 'service' AND tenant_id = public.get_user_tenant_id());


-- 14. audit_logs
DROP POLICY IF EXISTS "auth_can_insert_audit_logs" ON public.audit_logs;
CREATE POLICY "auth_can_insert_audit_logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (tenant_id = public.get_user_tenant_id());


-- 15. user_profiles
DROP POLICY IF EXISTS "admin_can_manage_all_profiles" ON public.user_profiles;
CREATE POLICY "admin_can_manage_all_profiles" ON public.user_profiles
  FOR ALL TO authenticated
  USING (
    public.get_user_role() = 'admin' 
    AND tenant_id = public.get_user_tenant_id()
  )
  WITH CHECK (
    public.get_user_role() = 'admin' 
    AND tenant_id = public.get_user_tenant_id()
  );

DROP POLICY IF EXISTS "users_can_read_all_in_tenant" ON public.user_profiles;
CREATE POLICY "users_can_read_all_in_tenant" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_user_tenant_id());
