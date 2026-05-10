import { supabase } from '@/lib/supabase/client';

export async function getInventoryUnits(tenantId: string, filters?: { status?: string, variantId?: string, condition?: string }) {
  let query = supabase
    .from('inventory_units')
    .select(`
      *,
      variant:vehicle_variants(
        name, specs, status,
        model:vehicle_models(
          manufacturer, name, subcategory,
          category:vehicle_categories(name, slug)
        ),
        powertrain:powertrain_types(display_label, slug)
      )
    `)
    .eq('tenant_id', tenantId)
    .order('received_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'All') {
    query = query.eq('status', filters.status.replace(/ /g, '_').toLowerCase());
  }
  if (filters?.variantId) {
    query = query.eq('variant_id', filters.variantId);
  }
  if (filters?.condition) {
    query = query.eq('condition', filters.condition.toLowerCase());
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getInventoryUnit(unitId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('inventory_units')
    .select(`
      *,
      variant:vehicle_variants(
        name, specs, status,
        model:vehicle_models(
          manufacturer, name, subcategory,
          category:vehicle_categories(name, slug)
        ),
        powertrain:powertrain_types(display_label, slug)
      )
    `)
    .eq('id', unitId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function getInventorySummary(tenantId: string) {
  const { data, error } = await supabase
    .from('inventory_units')
    .select('status')
    .eq('tenant_id', tenantId);

  if (error) throw error;

  const summary = { in_stock: 0, reserved: 0, demo: 0, sold: 0, written_off: 0, total: 0 };
  data?.forEach(unit => {
    summary.total++;
    if ((unit as any).status in summary) {
      summary[(unit as any).status as keyof typeof summary]++;
    }
  });

  return summary;
}

export async function getAgingInventory(tenantId: string, daysThreshold: number = 60) {
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - daysThreshold);
  
  const { data, error } = await supabase
    .from('inventory_units')
    .select(`
      id,
      chassis_number,
      received_date,
      created_at,
      status,
      variant:vehicle_variants(
        name,
        model:vehicle_models(name, manufacturer)
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'in_stock')
    .or(`received_date.lt.${thresholdDate.toISOString().split('T')[0]},received_date.is.null`)
    .order('received_date', { ascending: true });

  if (error) {
    console.error("Error fetching aging inventory:", error);
    return [];
  }

  // Calculate days in stock
  return (data || []).map((unit: any) => {
    const received = unit.received_date ? new Date(unit.received_date) : new Date(unit.created_at);
    const diffTime = Math.abs(new Date().getTime() - received.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      ...unit,
      daysInStock: diffDays
    };
  }).filter(u => u.daysInStock >= daysThreshold);
}

export async function createInventoryUnit(unitData: any, tenantId: string, userId: string) {
  const { data: variant, error: variantError } = await (supabase as any)
    .from('vehicle_variants')
    .select('status')
    .eq('id', unitData.variant_id)
    .single();

  if (variantError) throw variantError;
  if ((variant as any).status === 'discontinued' || (variant as any).status === 'draft') {
    return { error: 'VARIANT_NOT_ACTIVE' };
  }

  const insertData = { ...unitData, tenant_id: tenantId, created_by: userId };
  const { data, error } = await supabase
    .from('inventory_units')
    .insert(insertData)
    .select(`
      *,
      variant:vehicle_variants(
        name, specs, status,
        model:vehicle_models(
          manufacturer, name, subcategory,
          category:vehicle_categories(name, slug)
        ),
        powertrain:powertrain_types(display_label, slug)
      )
    `)
    .single();

  if (error) throw error;
  return { data };
}

export async function updateInventoryUnit(unitId: string, updateData: any, tenantId: string) {
  if (updateData.status === 'sold') {
    return { error: 'USE_SALE_FLOW' };
  }

  const { data, error } = await (supabase as any)
    .from('inventory_units')
    .update(updateData)
    .eq('id', unitId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw error;
  return { data };
}
