import { supabase } from '../supabase/client';

export async function getDashboardTrends(tenantId: string) {
  const today = new Date();
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);
  
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(today.getDate() - 60);

  // 1. Customers Created
  const { count: customersCurrent } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', thirtyDaysAgo.toISOString());

  const { count: customersPrev } = await supabase
    .from('customers')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', sixtyDaysAgo.toISOString())
    .lt('created_at', thirtyDaysAgo.toISOString());

  // 2. Leads (PreBookings) Created
  // Using all pre_bookings to measure lead generation flow
  const { count: leadsCurrent } = await supabase
    .from('pre_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('status', ['enquiry', 'confirmed', 'ordered']) 
    .gte('created_at', thirtyDaysAgo.toISOString());

  const { count: leadsPrev } = await supabase
    .from('pre_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .in('status', ['enquiry', 'confirmed', 'ordered']) 
    .gte('created_at', sixtyDaysAgo.toISOString())
    .lt('created_at', thirtyDaysAgo.toISOString());

  // 3. Sales (Vehicles Sold) & Revenue
  const { data: salesData } = await supabase
    .from('vehicles')
    .select('id, sale_date, variant:vehicle_variants(price)')
    .eq('tenant_id', tenantId)
    .gte('sale_date', sixtyDaysAgo.toISOString());

  const currentSales = (salesData as any[])?.filter(v => new Date(v.sale_date) >= thirtyDaysAgo) || [];
  const prevSales = (salesData as any[])?.filter(v => new Date(v.sale_date) >= sixtyDaysAgo && new Date(v.sale_date) < thirtyDaysAgo) || [];

  const revenueCurrent = currentSales.reduce((sum, v: any) => sum + (v.variant?.price || 0), 0);
  const revenuePrev = prevSales.reduce((sum, v: any) => sum + (v.variant?.price || 0), 0);

  // 4. Overdue FollowUps Trend 
  const { count: followupsDoneCurrent } = await supabase
    .from('customer_communications')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'done')
    .gte('updated_at', thirtyDaysAgo.toISOString());
    
  const { count: followupsDonePrev } = await supabase
    .from('customer_communications')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'done')
    .gte('updated_at', sixtyDaysAgo.toISOString())
    .lt('updated_at', thirtyDaysAgo.toISOString());

  const calcTrend = (curr: number | null, prev: number | null) => {
    curr = curr || 0;
    prev = prev || 0;
    if (prev === 0 && curr === 0) return 0;
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  return {
    customerTrend: calcTrend(customersCurrent, customersPrev),
    customerCurrent: customersCurrent || 0,
    leadsTrend: calcTrend(leadsCurrent, leadsPrev),
    leadsCurrent: leadsCurrent || 0,
    salesTrend: calcTrend(currentSales.length, prevSales.length),
    salesCurrent: currentSales.length,
    revenueTrend: calcTrend(revenueCurrent, revenuePrev),
    revenueCurrent: revenueCurrent || 0,
    activityTrend: calcTrend(followupsDoneCurrent, followupsDonePrev)
  };
}
