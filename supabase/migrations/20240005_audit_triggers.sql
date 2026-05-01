-- 20240005_audit_triggers.sql

CREATE OR REPLACE FUNCTION public.handle_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_record_id UUID;
  v_old_value JSONB;
  v_new_value JSONB;
  v_user_id UUID;
  v_tenant_id UUID;
BEGIN
  v_user_id := auth.uid();
  v_tenant_id := (
    auth.jwt() -> 'app_metadata' ->> 'tenant_id'
  )::UUID;

  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
    v_old_value := to_jsonb(OLD);
    v_new_value := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id;
    v_old_value := NULL;
    v_new_value := to_jsonb(NEW);
  ELSE
    v_record_id := NEW.id;
    v_old_value := to_jsonb(OLD);
    v_new_value := to_jsonb(NEW);
  END IF;

  INSERT INTO public.audit_logs (
    tenant_id, user_id, action,
    table_name, record_id, old_value, new_value
  ) VALUES (
    v_tenant_id, v_user_id, TG_OP,
    TG_TABLE_NAME, v_record_id, v_old_value, v_new_value
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit trigger to tables

-- vehicles
DROP TRIGGER IF EXISTS audit_vehicles ON public.vehicles;
CREATE TRIGGER audit_vehicles
  AFTER INSERT OR UPDATE OR DELETE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

-- customers
DROP TRIGGER IF EXISTS audit_customers ON public.customers;
CREATE TRIGGER audit_customers
  AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

-- service_records
DROP TRIGGER IF EXISTS audit_service_records ON public.service_records;
CREATE TRIGGER audit_service_records
  AFTER INSERT OR UPDATE OR DELETE ON public.service_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

-- service_parts
DROP TRIGGER IF EXISTS audit_service_parts ON public.service_parts;
CREATE TRIGGER audit_service_parts
  AFTER INSERT OR UPDATE OR DELETE ON public.service_parts
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

-- vehicle_variants
DROP TRIGGER IF EXISTS audit_vehicle_variants ON public.vehicle_variants;
CREATE TRIGGER audit_vehicle_variants
  AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_variants
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

-- vehicle_features
DROP TRIGGER IF EXISTS audit_vehicle_features ON public.vehicle_features;
CREATE TRIGGER audit_vehicle_features
  AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_features
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

-- vehicle_ownership_history
DROP TRIGGER IF EXISTS audit_vehicle_ownership_history ON public.vehicle_ownership_history;
CREATE TRIGGER audit_vehicle_ownership_history
  AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_ownership_history
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();
