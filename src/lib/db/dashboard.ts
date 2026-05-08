import { supabase } from '../supabase/client';

export async function getDashboardTrends(tenantId: string) {
  const today = new Date();
  
  // Weekly ranges
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(today.getDate() - 14);

  // Monthly ranges
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(today.getDate() - 60);

  const calcTrend = (curr: number | null, prev: number | null) => {
    curr = curr || 0;
    prev = prev || 0;
    if (prev === 0 && curr === 0) return 0;
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  // 1. Customers
  const fetchCustomerCount = async (from: Date, to?: Date) => {
    let query = supabase.from('customers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', from.toISOString());
    if (to) query = query.lt('created_at', to.toISOString());
    const { count } = await query;
    return count || 0;
  };

  // 2. Leads (PreBookings)
  const fetchLeadCount = async (from: Date, to?: Date) => {
    let query = supabase.from('pre_bookings').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('status', ['enquiry', 'confirmed', 'ordered']).gte('created_at', from.toISOString());
    if (to) query = query.lt('created_at', to.toISOString());
    const { count } = await query;
    return count || 0;
  };

  // 3. Sales & Revenue
  const fetchSalesData = async (from: Date) => {
    const { data } = await supabase.from('vehicles').select('id, sale_date, variant:vehicle_variants(price)').eq('tenant_id', tenantId).gte('sale_date', from.toISOString());
    return (data || []) as any[];
  };

  const [
    custWCur, custWPrev, custMCur, custMPrev,
    leadsWCur, leadsWPrev, leadsMCur, leadsMPrev,
    allSalesData
  ] = await Promise.all([
    fetchCustomerCount(sevenDaysAgo),
    fetchCustomerCount(fourteenDaysAgo, sevenDaysAgo),
    fetchCustomerCount(thirtyDaysAgo),
    fetchCustomerCount(sixtyDaysAgo, thirtyDaysAgo),
    fetchLeadCount(sevenDaysAgo),
    fetchLeadCount(fourteenDaysAgo, sevenDaysAgo),
    fetchLeadCount(thirtyDaysAgo),
    fetchLeadCount(sixtyDaysAgo, thirtyDaysAgo),
    fetchSalesData(sixtyDaysAgo)
  ]);

  const salesWCur = allSalesData.filter(v => new Date(v.sale_date) >= sevenDaysAgo);
  const salesWPrev = allSalesData.filter(v => new Date(v.sale_date) >= fourteenDaysAgo && new Date(v.sale_date) < sevenDaysAgo);
  const salesMCur = allSalesData.filter(v => new Date(v.sale_date) >= thirtyDaysAgo);
  const salesMPrev = allSalesData.filter(v => new Date(v.sale_date) >= sixtyDaysAgo && new Date(v.sale_date) < thirtyDaysAgo);

  const revWCur = salesWCur.reduce((sum, v) => sum + (v.variant?.price || 0), 0);
  const revWPrev = salesWPrev.reduce((sum, v) => sum + (v.variant?.price || 0), 0);
  const revMCur = salesMCur.reduce((sum, v) => sum + (v.variant?.price || 0), 0);
  const revMPrev = salesMPrev.reduce((sum, v) => sum + (v.variant?.price || 0), 0);

  return {
    customers: {
      week: calcTrend(custWCur, custWPrev),
      month: calcTrend(custMCur, custMPrev),
      current: custMCur
    },
    leads: {
      week: calcTrend(leadsWCur, leadsWPrev),
      month: calcTrend(leadsMCur, leadsMPrev),
      current: leadsMCur
    },
    sales: {
      week: calcTrend(salesWCur.length, salesWPrev.length),
      month: calcTrend(salesMCur.length, salesMPrev.length),
      current: salesMCur.length
    },
    revenue: {
      week: calcTrend(revWCur, revWPrev),
      month: calcTrend(revMCur, revMPrev),
      current: revMCur
    }
  };
}
