import { supabase } from '../supabase/client';

export async function searchCustomers(
  query: string,
  tenantId: string,
  page: number,
  pageSize: number
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  if (!query.trim()) {
    const { data: rows, error, count } = await supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { rows, totalCount: count || 0 };
  }

  // Using trigram similarity with a simple ilike approach for basic search
  // if not relying strictly on raw RPC or assuming pg_trgm is just operator %,
  // we can use standard supabase operators like or:
  const searchTerm = `%${query}%`;
  const { data: rows, error, count } = await supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .or(`name.ilike.${searchTerm},phone.ilike.${searchTerm},email.ilike.${searchTerm}`)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) throw error;
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
