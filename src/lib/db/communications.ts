import { supabase } from '@/lib/supabase/client';

export async function getCommunications(customerId: string, tenantId: string, filters?: { preBookingId?: string }) {
  try {
    let query = supabase
      .from('customer_communications')
      .select(`
        *,
        pre_booking:pre_bookings(id, variant_id, variant:vehicle_variants(name), status)
      `)
      .eq('customer_id', customerId)
      .eq('tenant_id', tenantId)
      .order('logged_at', { ascending: false });

    if (filters?.preBookingId) {
      query = query.eq('pre_booking_id', filters.preBookingId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching communications:', error);
      throw error;
    }
    
    return fetchCommunicationsWithProfiles(data);
  } catch (err) {
    console.error('getCommunications failed:', err);
    throw err;
  }
}

async function fetchCommunicationsWithProfiles(communications: any[]) {
  if (!communications || communications.length === 0) return [];
  
  const userIds = [...new Set(communications.map(c => c.logged_by).filter(Boolean))];
  
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name')
      .in('id', userIds);
      
    const profileMap = (profiles || []).reduce((acc: any, p: any) => {
      acc[p.id] = (p.first_name + ' ' + (p.last_name || '')).trim();
      return acc;
    }, {});
    
    return communications.map(c => ({
      ...c,
      user_name: profileMap[c.logged_by] || 'Unknown user'
    }));
  }
  
  return communications;
}

export async function getCriticalFollowUps(tenantId: string) {
  const in48h = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('customer_communications')
    .select(`
      *,
      customer:customers(name, phone),
      pre_booking:pre_bookings(id, variant_id, variant:vehicle_variants(name), status)
    `)
    .eq('tenant_id', tenantId)
    .eq('follow_up_done', false)
    .eq('log_type', 'followup')
    .lte('follow_up_date', in48h)
    .order('follow_up_date', { ascending: true });

  if (error) throw error;
  return data;
}

// Keep for backward compatibility if needed, but we'll update the dashboard
export const getFollowUpsDueToday = getCriticalFollowUps;

export async function createCommunication(commData: any, tenantId: string, userId: string) {
  if (commData.log_type === 'followup' && !commData.follow_up_date) {
    return { error: 'FOLLOW_UP_DATE_REQUIRED' };
  }

  const { data, error } = await supabase
    .from('customer_communications')
    .insert({
      ...commData,
      tenant_id: tenantId,
      logged_by: userId,
      logged_at: new Date().toISOString()
    })
    .select(`
      *,
      customer:customers(name, phone),
      pre_booking:pre_bookings(id, variant_id, variant:vehicle_variants(name), status)
    `)
    .single();

  if (error) throw error;
  return { data };
}

export async function markFollowUpDone(commId: string, tenantId: string, userId: string) {
  // First get the communication details to create a meaningful log
  const { data: original } = await supabase
    .from('customer_communications')
    .select('customer_id, interaction_type, notes')
    .eq('id', commId)
    .single();

  const { data, error } = await (supabase as any)
    .from('customer_communications')
    .update({ follow_up_done: true })
    .eq('id', commId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) throw error;

  // Create automated log
  const originalData = original as any;
  if (originalData) {
    await createCommunication({
      customer_id: originalData.customer_id,
      interaction_type: 'other',
      log_type: 'log',
      notes: `[System] Follow-up task "${originalData.notes || originalData.interaction_type}" marked as COMPLETED`,
    }, tenantId, userId);
  }

  return { data };
}
