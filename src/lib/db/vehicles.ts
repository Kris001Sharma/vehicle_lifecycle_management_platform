import { supabase } from '../supabase/client';
import { createCommunication } from './communications';

export async function getVariantsForSale(tenantId: string, options?: { excludePreOrderOnly?: boolean }) {
  const { data, error } = await supabase
    .from('vehicle_variants')
    .select(`
      id,
      name,
      status,
      availability_status,
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
  // Also respect availability_status if it exists
  const validData = (data || []).filter((v: any) => {
    if (!v.model || v.model.is_active === false) return false;
    if (v.availability_status === 'DISCONTINUED') return false;
    if (options?.excludePreOrderOnly && v.availability_status === 'PRE_ORDER_ONLY') return false;
    return true;
  });

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
      id, name, status, availability_status, price, specs, warranty_vehicle_yrs,
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
  userId: string,
  preBookingId?: string
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
    // 3. Update Pre-booking if converting
    if (preBookingId) {
      // First get the pre_booking to check if an inventory unit is attached
       const { data: pbData } = await (supabase as any)
         .from('pre_bookings')
         .select('inventory_unit_id')
         .eq('id', preBookingId)
         .single();
         
      await (supabase as any)
        .from('pre_bookings')
        .update({ 
          status: 'delivered', 
          vehicle_id: vehicle.id, 
          actual_delivery_date: new Date().toISOString().split('T')[0] 
        })
        .eq('id', preBookingId);
        
      if (pbData?.inventory_unit_id) {
         await (supabase as any)
           .from('inventory_units')
           .update({ status: 'sold' })
           .eq('id', pbData.inventory_unit_id);
      }
    }

    // Try to find a matching inventory unit by vehicle number and link it
    const { data: invData } = await (supabase as any)
      .from('inventory_units')
      .select('id')
      .eq('vehicle_number', saleData.vehicle_number)
      .maybeSingle();

    if (invData) {
      await (supabase as any)
        .from('inventory_units')
        .update({ status: 'sold' })
        .eq('id', invData.id);
    }

    // 4. Fetch variant_default_features for the variant
    const { data: features } = await (supabase as any)
      .from('variant_default_features')
      .select('feature_id, is_standard')
      .eq('variant_id', saleData.variant_id);

    if (features && features.length > 0) {
      // 5. Separate into standard and optional
      const featuresToInsert = features.filter((f: any) => 
        f.is_standard || selectedOptionalFeatureIds.includes(f.feature_id)
      );

      if (featuresToInsert.length > 0) {
        // 6. Insert vehicle_features rows
        const insertData = featuresToInsert.map((f: any) => ({
          vehicle_id: vehicle.id,
          feature_id: f.feature_id,
          is_standard: f.is_standard,
          tenant_id: tenantId
        }));

        await (supabase as any).from('vehicle_features').insert(insertData);
      }
    }

    // 7. Create automated log for customer
    await createCommunication({
      customer_id: saleData.customer_id,
      interaction_type: 'other',
      log_type: 'log',
      notes: `[System] Vehicle Sale Completed: ${saleData.vehicle_number}${preBookingId ? ' (Converted from Pre-booking)' : ''}`,
    }, tenantId, userId);

    // 8. Return vehicle with basic info
    return { vehicle };
  } catch (error) {
    // On any step failure after vehicle insert: do not attempt rollback
    console.error("Failed to insert features or update pre_booking:", error);
    await (supabase as any).from('error_logs').insert({
      tenant_id: tenantId,
      user_id: userId,
      error_type: 'PARTIAL_SUCCESS_VEHICLE_FEATURES_OR_PREBOOKING',
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
        service_interval_km, service_interval_months,
        powertrain:powertrain_types(display_label, slug),
        model:vehicle_models (
          manufacturer, name, subcategory, use_type,
          category:vehicle_categories(name, slug)
        )
      ),
      customer:customers (*),
      features:vehicle_features (
        is_standard,
        feature:features (id, name, category)
      ),
      vehicle_ownership_history (
        *,
        previous_customer:customers!vehicle_ownership_history_from_customer_id_fkey(name),
        new_customer:customers!vehicle_ownership_history_to_customer_id_fkey(name)
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
    .select('id, visit_date, visit_type, mileage_at_visit, next_service_km, next_service_date, status')
    .eq('vehicle_id', vehicleId)
    .order('visit_date', { ascending: false })
    .limit(3);

  const vehicle = data as any;
  const latestService = (serviceRecords && serviceRecords.length > 0 ? serviceRecords[0] : null) as any;

  // Holistic logic: If no service record exists, calculate the first service due based on sale_date and variant intervals
  let next_service_date = latestService?.next_service_date;
  let next_service_km = latestService?.next_service_km;

  if (!next_service_date && vehicle.variant?.service_interval_months) {
    const saleDate = new Date(vehicle.sale_date);
    saleDate.setMonth(saleDate.getMonth() + vehicle.variant.service_interval_months);
    next_service_date = saleDate.toISOString().split('T')[0];
  }

  if (!next_service_km && vehicle.variant?.service_interval_km) {
    next_service_km = vehicle.variant.service_interval_km;
  }

  return {
    ...vehicle,
    next_service_date,
    next_service_km,
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
        service_interval_months,
        powertrain:powertrain_types (display_label),
        model:vehicle_models (
          name, manufacturer, subcategory,
          category:vehicle_categories (name)
        )
      ),
      customer:customers (name, phone),
      service_records (next_service_date)
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
    rows: (data as any[])?.map((v: any) => {
      // Get next_service_date from the latest service record or calculate it
      let next_service_date = v.service_records?.[0]?.next_service_date;
      
      if (!next_service_date && v.variant?.service_interval_months) {
        const saleDate = new Date(v.sale_date);
        saleDate.setMonth(saleDate.getMonth() + v.variant.service_interval_months);
        next_service_date = saleDate.toISOString().split('T')[0];
      }

      return Object.assign({}, v, {
        model_name: v.variant?.model?.name,
        manufacturer: v.variant?.model?.manufacturer,
        category_name: v.variant?.model?.category?.name,
        subcategory: v.variant?.model?.subcategory,
        powertrain_display_label: v.variant?.powertrain?.display_label,
        customer_name: v.customer?.name,
        customer_phone: v.customer?.phone,
        next_service_date
      });
    }) || [],
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
    from_customer_id: (vehicle as any)?.customer_id || null,
    to_customer_id: newCustomerId,
    transferred_at: transferDate,
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

  // 6. Create automated logs for both customers
  if ((vehicle as any)?.customer_id) {
    await createCommunication({
      customer_id: (vehicle as any).customer_id,
      interaction_type: 'other',
      log_type: 'log',
      notes: `[System] Vehicle ownership of ${updated.vehicle_number} transferred to another customer.`,
    }, tenantId, userId);
  }

  await createCommunication({
    customer_id: newCustomerId,
    interaction_type: 'other',
    log_type: 'log',
    notes: `[System] Recorded as new owner for vehicle ${updated.vehicle_number} (Transferred).`,
  }, tenantId, userId);

  return updated;
}

export async function getVehiclesDueForService(tenantId: string, _withinDays: number) {
  const { data, error } = await supabase
    .from('vehicles')
    .select(`
      id, vehicle_number, last_service_date,
      variant:vehicle_variants(powertrain:powertrain_types(display_label), model:vehicle_models(name, manufacturer)),
      customer:customers(name, phone)
    `)
    .eq('tenant_id', tenantId)
    .eq('is_archived', false)
    .eq('status', 'active')
    .or(`last_service_date.is.null`);

  if (error) throw error;

  return data.map((v: any) => ({
    ...v,
    model: v.variant?.model,
  })).sort((a: any, b: any) => {
    if (!a.last_service_date && !b.last_service_date) return 0;
    if (!a.last_service_date) return 1;
    if (!b.last_service_date) return -1;
    return new Date(a.last_service_date).getTime() - new Date(b.last_service_date).getTime();
  });
}

export async function linkPreBookingToVehicle(
  preBookingId: string,
  vehicleId: string,
  tenantId: string
) {
  const { data, error } = await (supabase as any)
    .from('pre_bookings')
    .update({
      vehicle_id: vehicleId,
      status: 'delivered',
      actual_delivery_date: new Date().toISOString().split('T')[0]
    })
    .eq('id', preBookingId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function linkInventoryUnitToVehicle(
  unitId: string,
  tenantId: string
) {
  const { data, error } = await (supabase as any)
    .from('inventory_units')
    .update({ status: 'sold' })
    .eq('id', unitId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
