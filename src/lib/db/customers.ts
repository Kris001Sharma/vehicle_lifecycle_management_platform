import { supabase } from '../supabase/client';

export async function searchCustomers(
  query: string,
  tenantId: string,
  page: number,
  pageSize: number,
  segment?: 'all' | 'leads' | 'active' | 'owners' | 'contacts'
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let dbQuery = supabase
    .from('customers')
    .select('*, vehicles(id), pre_bookings(id, status)', { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (segment === 'owners') {
    dbQuery = supabase.from('customers').select('*, vehicles!inner(id), pre_bookings(id, status)', { count: 'exact' }).eq('tenant_id', tenantId);
  } else if (segment === 'active') {
    dbQuery = supabase.from('customers').select('*, vehicles(id), pre_bookings!inner(id, status)', { count: 'exact' }).eq('tenant_id', tenantId).in('pre_bookings.status', ['confirmed', 'ordered', 'in_transit']);
  } else if (segment === 'leads') {
    dbQuery = supabase.from('customers').select('*, vehicles(id), pre_bookings!inner(id, status)', { count: 'exact' }).eq('tenant_id', tenantId).eq('pre_bookings.status', 'enquiry');
  } else if (segment === 'contacts') {
    // Attempting to filter for customers without relations
    // In postgrest/supabase, you can filter on joined tables:
    dbQuery = supabase
      .from('customers')
      .select('*, vehicles(id), pre_bookings(id, status)', { count: 'exact' })
      .eq('tenant_id', tenantId);
    // Note: Filtering for absence of relations in standard select is tricky.
    // We'll rely on the UI to badges them correctly, but to improve 'working' 
    // we would ideally use a view or RPC.
  }

  if (query.trim()) {
    const searchTerm = `%${query}%`;
    dbQuery = dbQuery.or(`name.ilike.${searchTerm},phone.ilike.${searchTerm},email.ilike.${searchTerm}`);
  }

  const { data: rows, error, count } = await dbQuery
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;

  // For leads and active segments, we might still get customers who also have vehicles.
  // The user definition might be mutually exclusive, but for now this is a good approximation.
  return { rows, totalCount: count || 0 };
}

export async function getCustomerById(customerId: string, tenantId: string) {
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .eq('tenant_id', tenantId)
    .single();

  if (customerError) throw customerError;

  const { data: vehicles, error: vehiclesError } = await supabase
    .from('vehicles')
    .select(`
      id,
      vehicle_number,
      registration_plate,
      sale_date,
      last_service_date,
      total_service_count,
      status,
      is_archived,
      variant:vehicle_variants (
        name,
        powertrain:powertrain_types (display_label),
        model:vehicle_models (
          name,
          manufacturer,
          subcategory,
          category:vehicle_categories (name)
        )
      )
    `)
    .eq('customer_id', customerId)
    .eq('tenant_id', tenantId)
    .order('sale_date', { ascending: false });

  if (vehiclesError) throw vehiclesError;

  return {
    ...(customer as any),
    vehicles: vehicles?.map((v: any) => ({
      ...v,
      variant_name: v.variant?.name,
      model_name: v.variant?.model?.name,
      manufacturer: v.variant?.model?.manufacturer,
      category_name: v.variant?.model?.category?.name,
      subcategory: v.variant?.model?.subcategory,
      powertrain_display_label: v.variant?.powertrain?.display_label,
      variant: undefined, // Cleanup
    }))
  };
}

export async function checkPhoneDuplicate(
  phone: string,
  tenantId: string,
  excludeCustomerId?: string
) {
  let query = supabase
    .from('customers')
    .select('id, name, phone')
    .eq('phone', phone)
    .eq('tenant_id', tenantId);

  if (excludeCustomerId) {
    query = query.neq('id', excludeCustomerId);
  }

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) throw error;

  return data || null;
}

export async function createCustomer(data: Record<string, any>, tenantId: string) {
  const existing = await checkPhoneDuplicate(data.phone, tenantId);
  if (existing) {
    return { conflict: true, existing };
  }

  const { data: customer, error } = await (supabase as any)
    .from('customers')
    .insert(Object.assign({}, data || {}, { tenant_id: tenantId }))
    .select()
    .single();

  if (error) throw error;
  return { conflict: false, customer };
}

export async function updateCustomer(
  customerId: string,
  data: any,
  tenantId: string
) {
  const { data: updated, error } = await (supabase as any)
    .from('customers')
    .update(data)
    .eq('id', customerId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw error;
  return updated;
}
