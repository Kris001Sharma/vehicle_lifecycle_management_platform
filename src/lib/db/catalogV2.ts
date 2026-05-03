import { supabase } from '@/lib/supabase/client';

export async function getVehicleCategories(): Promise<any[]> {
  const { data, error } = await (supabase as any)
    .from('vehicle_categories')
    .select('*')
    .eq('is_active', true)
    .order('display_order');
  if (error) throw error;
  return data;
}

export async function getPowertrainTypes(): Promise<any[]> {
  const { data, error } = await (supabase as any)
    .from('powertrain_types')
    .select('*')
    .eq('is_active', true)
    .order('display_order');
  if (error) throw error;
  return data;
}

export async function getTenantCatalogConfig(tenantId: string): Promise<any | null> {
  const { data, error } = await (supabase as any)
    .from('tenant_catalog_config')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function upsertTenantCatalogConfig(tenantId: string, data: any): Promise<any> {
    const { data: result, error } = await (supabase as any)
        .from('tenant_catalog_config')
        .upsert({ ...data, tenant_id: tenantId }, { onConflict: 'tenant_id' })
        .select()
        .single();
    if (error) throw error;
    return result;
}

export async function getEnabledCategories(tenantId: string): Promise<any[]> {
    const config = await getTenantCatalogConfig(tenantId);
    const allCategories = await getVehicleCategories();
    
    if (!config || !config.enabled_category_ids || config.enabled_category_ids.length === 0) {
        return allCategories;
    }
    
    return allCategories.filter(c => config.enabled_category_ids.includes(c.id));
}

export async function getEnabledPowertrainTypes(tenantId: string): Promise<any[]> {
    const config = await getTenantCatalogConfig(tenantId);
    const allPowertrains = await getPowertrainTypes();
    
    if (!config || !config.enabled_powertrain_ids || config.enabled_powertrain_ids.length === 0) {
        return allPowertrains;
    }
    
    return allPowertrains.filter(p => config.enabled_powertrain_ids.includes(p.id));
}

export async function getEnabledManufacturers(tenantId: string): Promise<string[]> {
    const config = await getTenantCatalogConfig(tenantId);
    return config?.manufacturers || [];
}

export async function createVehicleModel(data: any, tenantId: string): Promise<any> {
    const { data: result, error } = await (supabase as any)
        .from('vehicle_models')
        .insert({ ...data, tenant_id: tenantId })
        .select()
        .single();
    if (error) throw error;
    return result;
}

export async function updateVehicleModel(modelId: string, data: any, tenantId: string): Promise<any> {
    const { data: result, error } = await (supabase as any)
        .from('vehicle_models')
        .update(data)
        .eq('id', modelId)
        .eq('tenant_id', tenantId)
        .select()
        .single();
    if (error) throw error;

    // If model is discontinued (not active), discontinue all its variants
    if (data.is_active === false || data.year_to) {
        await (supabase as any)
            .from('vehicle_variants')
            .update({ status: 'discontinued' })
            .eq('model_id', modelId)
            .eq('tenant_id', tenantId);
    }

    return result;
}

export async function getModelsWithCategory(tenantId: string): Promise<any[]> {
    const { data, error } = await (supabase as any)
        .from('vehicle_models')
        .select(`
            *,
            category:vehicle_categories (
                name,
                slug,
                display_order
            )
        `)
        .eq('tenant_id', tenantId);
    if (error) throw error;
    
    return data.sort((a: any, b: any) => {
        const orderA = a.category?.display_order ?? 999;
        const orderB = b.category?.display_order ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
    });
}

export async function createVariant(
    data: any, 
    features: { feature_id: string; is_standard: boolean }[], 
    _tenantId: string
): Promise<any> {
    const { data: variant, error: variantError } = await (supabase as any)
        .from('vehicle_variants')
        .insert({ ...data, tenant_id: _tenantId })
        .select()
        .single();
    if (variantError) throw variantError;

    if (features.length > 0) {
        const { error: featuresError } = await (supabase as any)
            .from('variant_default_features')
            .insert(
                features.map(f => ({
                    variant_id: variant.id,
                    feature_id: f.feature_id,
                    is_standard: f.is_standard
                }))
            );
        if (featuresError) {
            await (supabase as any).from('vehicle_variants').delete().eq('id', variant.id);
            throw featuresError;
        }
    }
    return variant;
}

export async function updateVariant(variantId: string, data: any, features: { feature_id: string; is_standard: boolean }[], tenantId: string): Promise<any> {
    // Check for active vehicles
    const { count, error: countError } = await (supabase as any)
        .from('vehicles')
        .select('*', { count: 'exact', head: true })
        .eq('variant_id', variantId)
        .eq('tenant_id', tenantId);
    
    if (countError) throw countError;
    if (count && count > 0) {
        throw new Error("Cannot edit a variant with sold vehicles.");
    }

    const { data: updated, error: updateError } = await (supabase as any)
        .from('vehicle_variants')
        .update(data)
        .eq('id', variantId)
        .eq('tenant_id', tenantId)
        .select()
        .single();
    if (updateError) throw updateError;
    
    // Replace features
    await (supabase as any).from('variant_default_features').delete().eq('variant_id', variantId);
    
    if (features.length > 0) {
        const { error: insError } = await (supabase as any)
            .from('variant_default_features')
            .insert(
                features.map(f => ({
                    variant_id: variantId,
                    feature_id: f.feature_id,
                    is_standard: f.is_standard
                }))
            );
        if (insError) throw insError;
    }
    return updated;
}

export async function cloneVariant(variantId: string, tenantId: string): Promise<any> {
    const { data: original, error: origError } = await (supabase as any)
        .from('vehicle_variants')
        .select(`
            *,
            features:variant_default_features (
                feature_id,
                is_standard
            )
        `)
        .eq('id', variantId)
        .single();
    if (origError) throw origError;

    const { id, created_at, updated_at, features, ...cloneData } = original;
    const { data: cloned, error: cloneError } = await (supabase as any)
        .from('vehicle_variants')
        .insert({
            ...cloneData,
            name: `Copy of ${cloneData.name}`,
            status: 'draft',
            tenant_id: tenantId
        })
        .select()
        .single();
    if (cloneError) throw cloneError;

    if (features && features.length > 0) {
        const { error: featError } = await (supabase as any)
            .from('variant_default_features')
            .insert(
                features.map((f: any) => ({
                    variant_id: cloned.id,
                    feature_id: f.feature_id,
                    is_standard: f.is_standard
                }))
            );
        if (featError) throw featError;
    }
    return cloned;
}

export async function discontinueVariant(variantId: string, tenantId: string): Promise<any> {
    const { data, error } = await (supabase as any)
        .from('vehicle_variants')
        .update({ status: 'discontinued' })
        .eq('id', variantId)
        .eq('tenant_id', tenantId)
        .select()
        .single();
    if (error) throw error;
    return data;
}

export async function getVariantWithDetails(variantId: string, _tenantId: string): Promise<any> {
    const { data, error } = await (supabase as any)
        .from('vehicle_variants')
        .select(`
            *,
            powertrain:powertrain_types (
                name,
                slug,
                display_label
            ),
            model:vehicle_models (
                name,
                category:vehicle_categories (
                    name,
                    slug
                )
            ),
            features:variant_default_features (
                is_standard,
                feature:features (
                    id,
                    name,
                    category
                )
            )
        `)
        .eq('id', variantId)
        .single();
    if (error) throw error;
    
    // Flatten features a bit
    const flattenedFeatures = data.features?.map((f: any) => ({
        is_standard: f.is_standard,
        ...f.feature
    })) || [];
    
    return { ...data, features: flattenedFeatures };
}

export async function getFeaturesByType(vehicleTypeId: string | null, tenantId: string): Promise<any[]> {
    let query = (supabase as any)
      .from('features')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('category')
      .order('name');
      
    if (vehicleTypeId) {
      query = query.or(`vehicle_type_id.eq.${vehicleTypeId},vehicle_type_id.is.null`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
}

export async function createFeature(
    data: { name: string; category: string; vehicle_type_id?: string | null; is_default_standard?: boolean }, 
    tenantId: string
): Promise<any> {
    const { data: result, error } = await (supabase as any)
      .from('features')
      .insert({ ...data, tenant_id: tenantId })
      .select()
      .single();
    if (error) throw error;
    return result;
}
