import { supabase } from '@/lib/supabase/client';

export async function getPreBookings(tenantId: string, filters?: { status?: string, customerId?: string, deliveryFrom?: string, deliveryTo?: string, vehicleId?: string }) {
  let query = supabase
    .from('pre_bookings')
    .select(`
      *,
      customer:customers(name, phone, customer_type),
      variant:vehicle_variants (
        name,
        model:vehicle_models (
          manufacturer, name, category:vehicle_categories (name)
        ),
        powertrain:powertrain_types (display_label)
      ),
      inventory_unit:inventory_units(chassis_number, colour, condition)
    `)
    .eq('tenant_id', tenantId);

  if (filters?.status && filters.status !== 'All') {
    query = query.eq('status', filters.status.replace(/ /g, '_').toLowerCase());
  }
  if (filters?.customerId) {
    query = query.eq('customer_id', filters.customerId);
  }
  if (filters?.vehicleId) {
    query = query.eq('vehicle_id', filters.vehicleId);
  }
  if (filters?.deliveryFrom) {
    query = query.gte('expected_delivery_date', filters.deliveryFrom);
  }
  if (filters?.deliveryTo) {
    query = query.lte('expected_delivery_date', filters.deliveryTo);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Custom sort: Non-delivered/cancelled first, then by expected_delivery_date ASC then booking_date DESC
  return data?.sort((a: any, b: any) => {
    const isCompletedA = a.status === 'delivered' || a.status === 'cancelled';
    const isCompletedB = b.status === 'delivered' || b.status === 'cancelled';
    
    if (isCompletedA !== isCompletedB) {
      return isCompletedA ? 1 : -1;
    }

    if (a.expected_delivery_date !== b.expected_delivery_date) {
      if (!a.expected_delivery_date) return 1;
      if (!b.expected_delivery_date) return -1;
      return new Date(a.expected_delivery_date).getTime() - new Date(b.expected_delivery_date).getTime();
    }

    return new Date(b.booking_date).getTime() - new Date(a.booking_date).getTime();
  });
}

export async function getPreBooking(bookingId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('pre_bookings')
    .select(`
      *,
      customer:customers(name, phone, customer_type),
      variant:vehicle_variants(name),
      model:vehicle_variants(model:vehicle_models(manufacturer, name, category:vehicle_categories(name))),
      powertrain:vehicle_variants(powertrain:powertrain_types(display_label)),
      inventory_unit:inventory_units(chassis_number, colour, condition)
    `)
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function getPreBookingsByCustomer(customerId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('pre_bookings')
    .select(`
      *,
      customer:customers(name, phone, customer_type),
      variant:vehicle_variants(name),
      model:vehicle_variants(model:vehicle_models(manufacturer, name, category:vehicle_categories(name))),
      powertrain:vehicle_variants(powertrain:powertrain_types(display_label)),
      inventory_unit:inventory_units(chassis_number, colour, condition)
    `)
    .eq('customer_id', customerId)
    .eq('tenant_id', tenantId)
    .order('booking_date', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createPreBooking(bookingData: any, tenantId: string, userId: string) {
  if (bookingData.inventory_unit_id) {
    const { data: unit, error: unitError } = await supabase
      .from('inventory_units')
      .select('status')
      .eq('id', bookingData.inventory_unit_id)
      .eq('tenant_id', tenantId)
      .single();
    
    if (unitError || !unit) throw new Error("Unit not found");
    if ((unit as any).status !== 'in_stock') {
      return { error: 'UNIT_NOT_AVAILABLE' };
    }

    await (supabase as any)
      .from('inventory_units')
      .update({ status: 'reserved' })
      .eq('id', bookingData.inventory_unit_id);
  }

  const { data: booking, error } = await (supabase as any)
    .from('pre_bookings')
    .insert({ ...bookingData, tenant_id: tenantId, created_by: userId, updated_by: userId } as any)
    .select(`
      *,
      customer:customers(name, phone, customer_type),
      variant:vehicle_variants(name),
      model:vehicle_variants(model:vehicle_models(manufacturer, name, category:vehicle_categories(name))),
      powertrain:vehicle_variants(powertrain:powertrain_types(display_label)),
      inventory_unit:inventory_units(chassis_number, colour, condition)
    `)
    .single();

  if (error) {
    // Attempt rollback if unit was reserved
    if (bookingData.inventory_unit_id) {
      await (supabase as any).from('inventory_units').update({ status: 'in_stock' }).eq('id', bookingData.inventory_unit_id);
    }
    throw error;
  }
  return { booking };
}

export async function updatePreBookingStatus(bookingId: string, newStatus: string, updateData: any, tenantId: string, userId: string) {
  const { data: current, error: currentError } = await (supabase as any)
    .from('pre_bookings')
    .select('status, inventory_unit_id')
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)
    .single();

  if (currentError) throw currentError;

  const allowedTransitions: Record<string, string[]> = {
    'enquiry': ['confirmed', 'cancelled'],
    'confirmed': ['ordered', 'cancelled'],
    'ordered': ['in_transit', 'cancelled'],
    'in_transit': ['delivered', 'cancelled']
  };

  if (newStatus !== (current as any).status) {
    const allowed = allowedTransitions[(current as any).status] || [];
    if (!allowed.includes(newStatus)) {
      return { error: 'INVALID_TRANSITION', current: (current as any).status };
    }
  }

  if (newStatus === 'cancelled' && (current as any).inventory_unit_id) {
    await (supabase as any)
      .from('inventory_units')
      .update({ status: 'in_stock' })
      .eq('id', (current as any).inventory_unit_id);
  }

  const { data: booking, error } = await (supabase as any)
    .from('pre_bookings')
    .update({ ...updateData, status: newStatus, updated_by: userId })
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw error;
  return { booking };
}

export async function cancelPreBooking(bookingId: string, reason: string, tenantId: string, userId: string) {
  return updatePreBookingStatus(bookingId, 'cancelled', { cancellation_reason: reason }, tenantId, userId);
}
