// @ts-nocheck
import { supabase } from '@/lib/supabase/client';
import { PartInput, ServiceRecordInput } from '../validations/service';
export { getVehiclesDueForService } from './vehicles';

export async function searchVehicleForService(query: string, tenantId: string) {
  if (!query || !query.trim()) return [];

  // 1. Fetch matching customers for phone/name (join equivalent for generic trigram simulation)
  const custQuery = `%${query}%`;
  const { data: custs } = await supabase
    .from('customers')
    .select('id')
    .eq('tenant_id', tenantId)
    .or(`name.ilike.${custQuery},phone.ilike.${custQuery}`);
  
  const custIds = custs?.map((c: any) => c.id) || [];

  // 2. Fetch vehicles
  let vQuery = supabase
    .from('vehicles')
    .select(`
      id, vehicle_number, registration_plate, is_archived, status, 
      last_service_date, total_service_count,
      customer:customers(name, phone),
      variant:vehicle_variants(name, specs, powertrain:powertrain_types(display_label, slug), model:vehicle_models(manufacturer, name, category:vehicle_categories(name, slug)))
    `)
    .eq('tenant_id', tenantId);

  const searchLike = `%${query}%`;
  let orString = `vehicle_number.ilike.${searchLike},registration_plate.ilike.${searchLike},chassis_number.ilike.${searchLike}`;
  if (custIds.length > 0) {
    orString += `,customer_id.in.(${custIds.join(',')})`;
  }
  
  vQuery = vQuery.or(orString).limit(10);
  
  const { data, error } = await vQuery;
  
  if (error) {
    console.error("Error searching vehicles:", error);
    return [];
  }
  return (data || []).map((v: any) => ({
    ...v,
    model: v.variant?.model,
  }));
}

export async function getServiceHistory(vehicleId: string, tenantId: string, page: number, pageSize: number) {
  const { data, count, error } = await supabase
    .from('service_records')
    .select('*, parts:service_parts(*)', { count: 'exact' })
    .eq('vehicle_id', vehicleId)
    .eq('tenant_id', tenantId)
    .order('visit_date', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (error) {
    console.error("Error fetching service history:", error);
    return { records: [], totalCount: 0, totalPages: 0 };
  }

  const records = data || [];
  
  // Fetch attachments
  if (records.length > 0) {
    const recordIds = records.map((r: any) => r.id);
    const { data: attachments } = await supabase
      .from('attachments')
      .select('*')
      .eq('entity_type', 'service_record')
      .in('entity_id', recordIds);
      
    if (attachments) {
      records.forEach((r: any) => {
        r.attachments = attachments.filter((a: any) => a.entity_id === r.id);
      });
    }
  }

  return {
    records,
    totalCount: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize)
  };
}

export async function getServiceRecord(recordId: string, tenantId: string) {
  const { data: record, error } = await supabase
    .from('service_records')
    .select('*, parts:service_parts(*), vehicle:vehicles(tenant_id)')
    .eq('id', recordId)
    .single();

  if (error || !record || record.vehicle.tenant_id !== tenantId) {
    return null;
  }

  const { data: attachments } = await supabase
    .from('attachments')
    .select('*')
    .eq('entity_type', 'service_record')
    .eq('entity_id', recordId);

  return { ...record, attachments: attachments || [] };
}

export async function createServiceRecord(data: ServiceRecordInput, vehicleId: string, parts: PartInput[], tenantId: string, _userId: string) {
  const { data: record, error } = await supabase
    .from('service_records')
    .insert({
      vehicle_id: vehicleId,
      tenant_id: tenantId,
      visit_date: data.visit_date,
      mileage_at_visit: data.mileage_at_visit,
      visit_type: data.visit_type,
      complaint: data.complaint,
      diagnosis: data.diagnosis,
      work_done: data.work_done,
      technician_name: data.technician_name,
      next_service_date: data.next_service_date,
      next_service_km: data.next_service_km,
      status: 'open'
    })
    .select()
    .single();

  if (error || !record) {
    console.error("Failed to insert service record", error);
    throw new Error("Failed to save service record");
  }

  if (parts.length > 0) {
    const partsData = parts.map(p => ({
      service_record_id: record.id,
      tenant_id: tenantId,
      ...p
    }));

    const { error: partsError } = await supabase.from('service_parts').insert(partsData);
    if (partsError) {
      console.error("Failed to insert parts", partsError);
      return { record, warning: 'PARTS_SAVE_FAILED' };
    }
  }

  return { record };
}

export async function updateServiceRecord(recordId: string, data: ServiceRecordInput, parts: PartInput[], tenantId: string) {
  const existing = await getServiceRecord(recordId, tenantId);
  if (!existing) return { error: 'RECORD_NOT_FOUND' };
  if (existing.status === 'completed') return { error: 'RECORD_CLOSED' };

  const { data: record, error } = await supabase
    .from('service_records')
    .update({
      visit_date: data.visit_date,
      mileage_at_visit: data.mileage_at_visit,
      visit_type: data.visit_type,
      complaint: data.complaint,
      diagnosis: data.diagnosis,
      work_done: data.work_done,
      technician_name: data.technician_name,
      next_service_date: data.next_service_date,
      next_service_km: data.next_service_km,
    })
    .eq('id', recordId)
    .select()
    .single();

  if (error || !record) {
    console.error("Update failed", error);
    throw new Error("Failed to update service record");
  }

  // Replace parts
  await supabase.from('service_parts').delete().eq('service_record_id', recordId).eq('tenant_id', tenantId);

  if (parts.length > 0) {
    const partsData = parts.map(p => ({
      service_record_id: record.id,
      tenant_id: tenantId,
      ...p
    }));
    await supabase.from('service_parts').insert(partsData);
  }

  return { record };
}

export async function closeServiceRecord(recordId: string, tenantId: string, _userId: string) {
  const existing = await getServiceRecord(recordId, tenantId);
  if (!existing) return { error: 'RECORD_NOT_FOUND' };
  if (existing.status === 'completed') return { error: 'ALREADY_CLOSED' };
  if (!existing.work_done || !existing.work_done.trim()) return { error: 'WORK_DONE_REQUIRED' };

  const { data: record, error } = await supabase
    .from('service_records')
    .update({ status: 'completed' })
    .eq('id', recordId)
    .select()
    .single();

  if (error) {
    throw new Error("Failed to close record");
  }

  return { record };
}

export async function getOpenJobCards(tenantId: string) {
  const { data, error } = await supabase
    .from('service_records')
    .select(`
      *,
      vehicle:vehicles(vehicle_number, customer:customers(name, phone), variant:vehicle_variants(model:vehicle_models(manufacturer, name, category:vehicle_categories(name))))
    `)
    .eq('status', 'open')
    .eq('tenant_id', tenantId)
    .order('visit_date', { ascending: true });

  if (error) {
    console.error("Failed to get open job cards", error);
    return [];
  }

  if (data && data.length > 50) {
    console.warn(`High volume of open job cards: ${data.length}`);
  }

  return (data || []).map((card: any) => ({
    ...card,
    vehicle: {
      ...card.vehicle,
      model: card.vehicle?.variant?.model
    }
  }));
}
