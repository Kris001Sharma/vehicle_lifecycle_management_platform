ALTER TABLE public.tenant_catalog_config
  ADD COLUMN IF NOT EXISTS
  finance_tracking_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE public.inventory_units (
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

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.inventory_units
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.inventory_units
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_sales_can_manage_inventory"
ON public.inventory_units FOR ALL
USING (
  tenant_id = public.get_user_tenant_id()
  AND public.get_user_role() IN ('admin','sales')
);

CREATE INDEX idx_inventory_units_tenant
  ON public.inventory_units(tenant_id);
CREATE INDEX idx_inventory_units_variant
  ON public.inventory_units(variant_id);
CREATE INDEX idx_inventory_units_status
  ON public.inventory_units(status);
CREATE INDEX idx_inventory_units_chassis
  ON public.inventory_units(chassis_number);

CREATE TABLE public.pre_bookings (
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

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.pre_bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.pre_bookings
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_sales_can_manage_prebookings"
ON public.pre_bookings FOR ALL
USING (
  tenant_id = public.get_user_tenant_id()
  AND public.get_user_role() IN ('admin','sales')
);

CREATE POLICY "service_can_read_prebookings"
ON public.pre_bookings FOR SELECT
USING (tenant_id = public.get_user_tenant_id());

CREATE INDEX idx_pre_bookings_tenant
  ON public.pre_bookings(tenant_id);
CREATE INDEX idx_pre_bookings_customer
  ON public.pre_bookings(customer_id);
CREATE INDEX idx_pre_bookings_status
  ON public.pre_bookings(status);
CREATE INDEX idx_pre_bookings_delivery
  ON public.pre_bookings(expected_delivery_date);

CREATE TABLE public.customer_communications (
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

ALTER TABLE public.customer_communications
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_sales_can_manage_comms"
ON public.customer_communications FOR ALL
USING (
  tenant_id = public.get_user_tenant_id()
  AND public.get_user_role() IN ('admin','sales')
);

CREATE INDEX idx_comms_tenant
  ON public.customer_communications(tenant_id);
CREATE INDEX idx_comms_customer
  ON public.customer_communications(customer_id);
CREATE INDEX idx_comms_follow_up
  ON public.customer_communications(follow_up_date)
  WHERE follow_up_done = false
  AND log_type = 'followup';

CREATE TRIGGER audit_inventory_units
  AFTER INSERT OR UPDATE OR DELETE
  ON public.inventory_units
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER audit_pre_bookings
  AFTER INSERT OR UPDATE OR DELETE
  ON public.pre_bookings
  FOR EACH ROW EXECUTE FUNCTION public.handle_audit_log();
