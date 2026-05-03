import { supabase } from '@/lib/supabase/client';
import { Database } from '@/types/database.types';

type VehicleVariant = Database['public']['Tables']['vehicle_variants']['Row'];

// Database definition extensions
export interface Feature {
  id: string;
  tenant_id: string;
  vehicle_type_id: string | null;
  name: string;
  category: string;
  is_default_standard: boolean;
  created_at: string;
}

export interface VariantDefaultFeature {
  variant_id: string;
  feature_id: string;
  is_standard: boolean;
}

export interface VariantWithFeatures extends VehicleVariant {
  features: {
    feature: Feature;
    is_standard: boolean;
  }[];
}

const slugify = (text: string) => 
  text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

export async function getVehicleTypes(tenantId: string): Promise<any[]> {
  const { data, error } = await (supabase as any)
    .from('vehicle_types')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name');
  if (error) throw error;
  return data;
}

export async function getModelsByType(typeId: string, tenantId: string): Promise<any[]> {
  const { data, error } = await (supabase as any)
    .from('vehicle_models')
    .select('*')
    .eq('type_id', typeId)
    .eq('tenant_id', tenantId)
    .order('name');
  if (error) throw error;
  return data;
}

export async function getVariantsByModel(modelId: string, tenantId: string): Promise<any[]> {
  const { data, error } = await (supabase as any)
    .from('vehicle_variants')
    .select('*')
    .eq('model_id', modelId)
    .eq('tenant_id', tenantId)
    .order('name');
  if (error) throw error;
  return data;
}

export async function getVariantWithFeatures(variantId: string, tenantId: string): Promise<any> {
  const { data, error } = await (supabase as any)
    .from('vehicle_variants')
    .select(`
      *,
      variant_default_features!inner(
        is_standard,
        features!inner(*)
      )
    `)
    .eq('id', variantId)
    .eq('tenant_id', tenantId)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') {
      // It might not have features yet, so fallback
      const { data: variantOnly, error: variantError } = await (supabase as any)
        .from('vehicle_variants')
        .select('*')
        .eq('id', variantId)
        .eq('tenant_id', tenantId)
        .single();
      if (variantError) throw variantError;
      return { ...variantOnly, features: [] };
    }
    throw error;
  }
  
  // map variant_default_features to the expected shape
  const mapped = {
    ...(data as any),
    features: (data as any).variant_default_features.map((vdf: any) => ({
      is_standard: vdf.is_standard,
      feature: vdf.features
    }))
  };
  return mapped;
}

export async function createVehicleType(data: { name: string }, tenantId: string): Promise<any> {
  const slug = slugify(data.name);
  const { data: result, error } = await (supabase as any)
    .from('vehicle_types')
    .insert({ ...data, slug, tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function createVehicleModel(data: { name: string; type_id: string; description?: string }, tenantId: string): Promise<any> {
  const { data: result, error } = await (supabase as any)
    .from('vehicle_models')
    .insert({ ...data, tenant_id: tenantId })
    .select()
    .single();
  if (error) throw error;
  return result;
}

export async function createVariant(
  data: any, 
  features: { feature_id: string; is_standard: boolean }[], 
  tenantId: string
): Promise<any> {
  // Insert variant first
  const { data: variant, error: variantError } = await (supabase as any)
    .from('vehicle_variants')
    .insert({ ...data, tenant_id: tenantId })
    .select()
    .single();
    
  if (variantError) throw variantError;

  // Insert features
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
      console.error('Failed to insert variant features, rolling back variant:', featuresError);
      await (supabase as any).from('vehicle_variants').delete().eq('id', variant.id);
      throw new Error(`Failed to associate features to variant: ${featuresError.message}`);
    }
  }

  return variant;
}

export async function updateVariant(
  variantId: string, 
  data: any, 
  features: { feature_id: string; is_standard: boolean }[], 
  tenantId: string
): Promise<any> {
  // Check if sold vehicles exist
  const { count, error: countError } = await (supabase as any)
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('variant_id', variantId)
    .eq('tenant_id', tenantId);
    
  if (countError) throw countError;
  if (count && count > 0) {
    throw new Error("Cannot edit a variant with sold vehicles. Clone and create a new variant instead.");
  }

  const { data: updated, error: updateError } = await (supabase as any)
    .from('vehicle_variants')
    .update(data)
    .eq('id', variantId)
    .eq('tenant_id', tenantId)
    .select()
    .single();
    
  if (updateError) throw updateError;
  
  // Replace features: delete existing, then insert new
  const { error: delError } = await (supabase as any)
    .from('variant_default_features')
    .delete()
    .eq('variant_id', variantId);
    
  if (delError) throw delError;
  
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
  const original = await getVariantWithFeatures(variantId, tenantId);
  
  const { data: clonedVariant, error: cloneError } = await (supabase as any)
    .from('vehicle_variants')
    .insert({
      tenant_id: tenantId,
      model_id: original.model_id,
      name: `Copy of ${original.name}`,
      sku: original.sku ? `${original.sku}-COPY` : null,
      status: 'draft',
      specs: original.specs,
      service_interval_km: original.service_interval_km,
      service_interval_months: original.service_interval_months,
      warranty_vehicle_yrs: original.warranty_vehicle_yrs,
      warranty_battery_yrs: original.warranty_battery_yrs,
      warranty_motor_yrs: original.warranty_motor_yrs,
      launched_at: original.launched_at,
    })
    .select()
    .single();
    
  if (cloneError) throw cloneError;
  
  if (original.features && original.features.length > 0) {
    const { error: featuresError } = await (supabase as any)
      .from('variant_default_features')
      .insert(
        original.features.map((f: any) => ({
          variant_id: clonedVariant.id,
          feature_id: f.feature.id,
          is_standard: f.is_standard
        }))
      );
      
    if (featuresError) {
      // rollback
      await (supabase as any).from('vehicle_variants').delete().eq('id', clonedVariant.id);
      throw new Error(`Failed to clone features: ${featuresError.message}`);
    }
  }
  
  return clonedVariant;
}

export async function discontinueVariant(variantId: string, tenantId: string): Promise<any> {
  const { count, error: countError } = await (supabase as any)
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('variant_id', variantId)
    .eq('status', 'active')
    .eq('tenant_id', tenantId);
    
  if (countError) throw countError;
  if (count && count > 0) {
    throw new Error("Cannot discontinue — active vehicles exist.");
  }
  
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

export async function getFeaturesByType(vehicleTypeId: string | null, tenantId: string): Promise<any[]> {
  let query = (supabase as any)
    .from('features')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('category')
    .order('name');
    
  // If typeId given, fetch features for that type AND features with no type (applicable to all)
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

export async function updateFeature(
  featureId: string, 
  data: any, 
  tenantId: string
): Promise<any> {
  const { data: result, error } = await (supabase as any)
    .from('features')
    .update(data)
    .eq('id', featureId)
    .eq('tenant_id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return result;
}
