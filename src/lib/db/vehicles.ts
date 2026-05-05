import { supabase } from '../supabase/client';

export async function getVariantsForSale(tenantId: string) {
  const { data, error } = await supabase
    .from('vehicle_variants')
    .select(`
      id,
      name,
      status,
      price,
      specs,
      powertrain:powertrain_types (display_label, slug),
      model:vehicle_models (
        id,
        manufacturer,
        name,
        subcategory,
        use_type,
        is_active,
        category:vehicle_categories (id, name, slug)
      )
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'active');

  if (error) {
    console.error("Error fetching variants for sale:", error);
    throw error;
  }

  // Filter out any variants that don't have a valid model/category or inactive models
  const validData = (data || []).filter((v: any) => v.model && v.model.is_active !== false);

  // Group by category then model
  const categorized: Record<string, any> = {};
  
  validData.forEach((variant: any) => {
    const category = variant.model.category || { id: 'uncategorized', name: 'Uncategorized', slug: 'uncategorized' };
    const model = variant.model;
    
    if (!categorized[category.id]) {
      categorized[category.id] = {
        id: category.id,
        name: category.name,
        slug: category.slug,
        models: {}
      };
    }
    
    if (!categorized[category.id].models[model.id]) {
      categorized[category.id].models[model.id] = {
        id: model.id,
        name: model.name,
        manufacturer: model.manufacturer,
        subcategory: model.subcategory,
        variants: []
      };
    }
    
    // Create a clean variant object
    const variantClean = {
      id: variant.id,
      name: variant.name,
      price: variant.price,
      specs: variant.specs,
      powertrain: variant.powertrain
    };
    
    categorized[category.id].models[model.id].variants.push(variantClean);
  });

  return Object.values(categorized).map((c: any) => ({
    ...c,
    models: Object.values(c.models)
  }));
}

export async function getVariantDetails(variantId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('vehicle_variants')
    .select(`
      *,
      powertrain:powertrain_types (display_label, slug),
      model:vehicle_models (
        manufacturer,
        name,
        subcategory,
        use_type,
        category:vehicle_categories (name, slug)
      )
    `)
    .eq('id', variantId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function checkVehicleNumberUnique(
  vehicleNumber: string,
  tenantId: string,
  excludeVehicleId?: string
) {
  let query = supabase
    .from('vehicles')
    .select('id')
    .ilike('vehicle_number', vehicleNumber)
    .eq('tenant_id', tenantId);

  if (excludeVehicleId) {
    query = query.neq('id', excludeVehicleId);
  }

  const { data, error } = await query.limit(1).maybeSingle();
  if (error) return false; // Fail safe
  return !data;
}

export async function createVehicleSale(
  saleData: any,
  selectedOptionalFeatureIds: string[],
  tenantId: string,
  userId: string
) {
  // 1. Re-check vehicle_number uniqueness server-side
  const isUnique = await checkVehicleNumberUnique(saleData.vehicle_number, tenantId);
  if (!isUnique) {
    return { error: 'VEHICLE_NUMBER_TAKEN' };
  }

  // 2. Insert vehicle row
  const { data: vehicle, error: vehicleError } = await (supabase as any)
    .from('vehicles')
    .insert(Object.assign({}, saleData || {}, { tenant_id: tenantId }))
    .select()
    .single();

  if (vehicleError) {
    throw vehicleError;
  }

  try {
    // 3. Fetch variant_default_features for the variant
    const { data: features } = await (supabase as any)
      .from('variant_default_features')
      .select('feature_id, type')
      .eq('variant_id', saleData.variant_id);

    if (features && features.length > 0) {
      // 4. Separate into standard and optional
      const featuresToInsert = features.filter((f: any) => 
        f.type === 'standard' || selectedOptionalFeatureIds.includes(f.feature_id)
      );

      if (featuresToInsert.length > 0) {
        // 5. Insert vehicle_features rows
        const insertData = featuresToInsert.map((f: any) => ({
          vehicle_id: vehicle.id,
          feature_id: f.feature_id,
          type: f.type || '',
          tenant_id: tenantId
        }));

        await (supabase as any).from('vehicle_features').insert(insertData);
      }
    }

    // 6. Return vehicle with basic info (it will be fully fetched in page)
    return { vehicle };
  } catch (error) {
    // On any step failure after vehicle insert: do not attempt rollback
    // log to error_logs with entity_id and return PARTIAL_SUCCESS
    console.error("Failed to insert features:", error);
    await (supabase as any).from('error_logs').insert({
      tenant_id: tenantId,
      user_id: userId,
      error_type: 'PARTIAL_SUCCESS_VEHICLE_FEATURES',
      error_message: String(error),
      entity_type: 'vehicle',
      entity_id: vehicle?.id
    });
    
    return { error: 'PARTIAL_SUCCESS', vehicleId: vehicle?.id };
  }
}

export async function getVehicleWithFullDetails(vehicleId: string, tenantId: string) {
  const { data, error } = await supabase
    .from('vehicles')
    .select(`
      id, vehicle_number, chassis_number, registration_plate, sale_date, 
      last_service_date, status, is_archived, sale_notes, total_service_count,
      variant:vehicle_variants (
        id, name, specs, status, powertrain_type_id,
        powertrain:powertrain_types(display_label, slug),
        model:vehicle_models (
          manufacturer, name, subcategory, use_type,
          category:vehicle_categories(name, slug)
        )
      ),
      customer:customers (*),
      features:vehicle_features (
        type,
        feature:features (id, name, category)
      )
    `)
    .eq('id', vehicleId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // Fetch last 3 service records
  const { data: serviceRecords } = await supabase
    .from('service_records')
    .select('id, record_date, service_type, odometer_reading, total_cost, status')
    .eq('vehicle_id', vehicleId)
    .order('record_date', { ascending: false })
    .limit(3);

  return {
    ...(data as any),
    service_records: serviceRecords || []
  };
}

export async function searchVehicles(
  query: string,
  tenantId: string,
  page: number,
  pageSize: number
) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let supabaseQuery = supabase
    .from('vehicles')
    .select(`
      id, vehicle_number, chassis_number, registration_plate, sale_date, 
      last_service_date, status, is_archived,
      variant:vehicle_variants (
        name,
        powertrain:powertrain_types (display_label),
        model:vehicle_models (
          name, manufacturer, subcategory,
          category:vehicle_categories (name)
        )
      ),
      customer:customers (name, phone)
    `, { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (query.trim()) {
    const searchTerm = `%${query}%`;
    supabaseQuery = supabaseQuery.or(`vehicle_number.ilike.${searchTerm},chassis_number.ilike.${searchTerm},registration_plate.ilike.${searchTerm}`);
  }

  console.log("Searching vehicles for tenant:", tenantId, "query:", query);
  
  const { data, error, count } = await supabaseQuery
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error("Supabase vehicles fetch error:", error);
    throw error;
  }

  console.log("Vehicles fetch result:", { count, rowCount: data?.length });

  return {
    rows: data?.map((v: any) => Object.assign({}, v, {
      model_name: v.variant?.model?.name,
      manufacturer: v.variant?.model?.manufacturer,
      category_name: v.variant?.model?.category?.name,
      subcategory: v.variant?.model?.subcategory,
      powertrain_display_label: v.variant?.powertrain?.display_label,
      customer_name: v.customer?.name,
      customer_phone: v.customer?.phone
    })) || [],
    totalCount: count || 0
  };
}

export async function transferVehicleOwnership(
  vehicleId: string,
  newCustomerId: string,
  transferDate: string,
  notes: string,
  tenantId: string,
  userId: string
) {
  // 1. Fetch current customer_id
  const { data: vehicle, error: fetchErr } = await supabase
    .from('vehicles')
    .select('customer_id')
    .eq('id', vehicleId)
    .single();

  if (fetchErr) throw fetchErr;

  // 2. Verify new customer exists
  const { data: newCustomer, error: custErr } = await supabase
    .from('customers')
    .select('id')
    .eq('id', newCustomerId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (custErr) throw custErr;
  if (!newCustomer) return { error: 'CUSTOMER_NOT_FOUND' };

  // 3. Verify not same
  if ((vehicle as any).customer_id === newCustomerId) {
    return { error: 'SAME_CUSTOMER' };
  }

  // 4. Insert history row
  await (supabase as any).from('vehicle_ownership_history').insert({
    vehicle_id: vehicleId,
    previous_customer_id: (vehicle as any)?.customer_id || null,
    new_customer_id: newCustomerId,
    transfer_date: transferDate,
    notes,
    tenant_id: tenantId,
    recorded_by: userId
  });

  // 5. Update vehicle customer_id
  const { data: updated, error: updateErr } = await (supabase as any)
    .from('vehicles')
    .update({ customer_id: newCustomerId })
    .eq('id', vehicleId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  return updated;
}

export async function getVehiclesDueForService(tenantId: string, _withinDays: number) {
  const { data, error } = await supabase
    .from('vehicles')
    .select(`
      id, vehicle_number, last_service_date,
      model:vehicle_models(name, manufacturer),
      variant:vehicle_variants(powertrain:powertrain_types(display_label)),
      customer:customers(name, phone)
    `)
    .eq('tenant_id', tenantId)
    .eq('is_archived', false)
    .eq('status', 'active')
    .or(`last_service_date.is.null`);

  if (error) throw error;

  return data.sort((a: any, b: any) => {
    if (!a.last_service_date && !b.last_service_date) return 0;
    if (!a.last_service_date) return 1;
    if (!b.last_service_date) return -1;
    return new Date(a.last_service_date).getTime() - new Date(b.last_service_date).getTime();
  });
}
