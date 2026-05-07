-- tenant_id indexes (every table)
CREATE INDEX IF NOT EXISTS idx_vehicle_types_tenant
  ON public.vehicle_types(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_models_tenant
  ON public.vehicle_models(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_variants_tenant
  ON public.vehicle_variants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_features_tenant ON public.features(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_tenant ON public.vehicles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_features_tenant
  ON public.vehicle_features(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_records_tenant
  ON public.service_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_parts_tenant
  ON public.service_parts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_attachments_tenant
  ON public.attachments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON public.audit_logs(tenant_id);

-- Catalog and Sales indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_models_category
  ON public.vehicle_models(category_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_variants_powertrain
  ON public.vehicle_variants(powertrain_type_id);
CREATE INDEX IF NOT EXISTS idx_tenant_catalog_config_tenant
  ON public.tenant_catalog_config(tenant_id);

CREATE INDEX IF NOT EXISTS idx_inventory_units_tenant ON public.inventory_units(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_units_variant ON public.inventory_units(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_units_status ON public.inventory_units(status);
CREATE INDEX IF NOT EXISTS idx_inventory_units_chassis ON public.inventory_units(chassis_number);

CREATE INDEX IF NOT EXISTS idx_pre_bookings_tenant ON public.pre_bookings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pre_bookings_customer ON public.pre_bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_pre_bookings_variant ON public.pre_bookings(variant_id);
CREATE INDEX IF NOT EXISTS idx_pre_bookings_status ON public.pre_bookings(status);
CREATE INDEX IF NOT EXISTS idx_pre_bookings_delivery ON public.pre_bookings(expected_delivery_date);

CREATE INDEX IF NOT EXISTS idx_comms_tenant ON public.customer_communications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_comms_customer ON public.customer_communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_comms_follow_up
  ON public.customer_communications(follow_up_date)
  WHERE follow_up_done = false
  AND log_type = 'followup';

-- Foreign key indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_models_type
  ON public.vehicle_models(type_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_variants_model
  ON public.vehicle_variants(model_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_variant
  ON public.vehicles(variant_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_customer
  ON public.vehicles(customer_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_features_vehicle
  ON public.vehicle_features(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_service_records_vehicle
  ON public.service_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_service_parts_record
  ON public.service_parts(service_record_id);
CREATE INDEX IF NOT EXISTS idx_attachments_entity
  ON public.attachments(entity_id);

-- Search indexes (GIN trigram)
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm
  ON public.customers USING GIN (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_phone_trgm
  ON public.customers USING GIN (phone gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vehicles_number_trgm
  ON public.vehicles USING GIN (vehicle_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vehicles_chassis_trgm
  ON public.vehicles USING GIN (chassis_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_trgm
  ON public.vehicles USING GIN
  (registration_plate gin_trgm_ops);

-- Status and date indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_archived
  ON public.vehicles(is_archived) WHERE is_archived = true;
CREATE INDEX IF NOT EXISTS idx_service_records_status
  ON public.service_records(status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_vehicles_last_service
  ON public.vehicles(last_service_date);
