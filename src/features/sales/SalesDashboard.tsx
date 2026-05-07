import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/features/auth/store/authStore';
import { supabase } from '@/lib/supabase/client';
import { getInventorySummary } from '@/lib/db/inventory';
import { getPreBookings } from '@/lib/db/preBookings';
import { getFollowUpsDueToday, markFollowUpDone } from '@/lib/db/communications';
import { getDashboardTrends } from '@/lib/db/dashboard';
import { useToast } from '@/hooks/useToast';
import { Phone, MessageSquare, Mail, Building, User, FileText, TrendingUp, TrendingDown, CheckCircle2, Clock, Zap, Award, Target, Trophy } from 'lucide-react';
import { cn } from '@/utils/cn';

export function SalesDashboard() {
  const { tenantId, email, fullName } = useAuthStore(s => s.user!) || {};
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['sales_stats', tenantId],
    queryFn: async () => {
      const [{ count: custCount }] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      ]);
      return { customers: custCount || 0 };
    },
    enabled: !!tenantId,
  });

  const { data: trends, isLoading: trendsLoading } = useQuery({
    queryKey: ['dashboard_trends', tenantId],
    queryFn: () => getDashboardTrends(tenantId!),
    enabled: !!tenantId,
  });

  const { data: recentSales, isLoading: recentLoading } = useQuery({
    queryKey: ['sales_recent', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('vehicles')
        .select(`
          id, vehicle_number, sale_date,
          variant:vehicle_variants (
            name,
            model:vehicle_models (name, manufacturer)
          ),
          customer:customers(name)
        `)
        .eq('tenant_id', tenantId)
        .order('sale_date', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data: inventoryStats, isLoading: invLoading } = useQuery({
    queryKey: ['inventory_summary', tenantId],
    queryFn: () => getInventorySummary(tenantId!),
    enabled: !!tenantId,
  });

  const { data: allPreBookings, isLoading: pbLoading } = useQuery({
    queryKey: ['pre_bookings_all', tenantId],
    queryFn: () => getPreBookings(tenantId!),
    enabled: !!tenantId,
  });

  const { data: followUps, isLoading: foLoading } = useQuery({
    queryKey: ['follow_ups_due', tenantId],
    queryFn: () => getFollowUpsDueToday(tenantId!),
    enabled: !!tenantId,
  });

  const { data: achievementData } = useQuery({
    queryKey: ['achievement_config', tenantId],
    queryFn: async () => {
      const [milestoneRes, configRes] = await Promise.all([
        (supabase as any).from('achievement_milestones').select('*').eq('tenant_id', tenantId).order('order_index', { ascending: true }),
        (supabase as any).from('tenant_achievement_config').select('*').eq('tenant_id', tenantId).single()
      ]);
      return { 
        milestones: (milestoneRes.data || []) as any[], 
        config: (configRes.data || { quote: "Consistency is the playground of the foundation of the champion." }) as any 
      };
    },
    enabled: !!tenantId,
  });

  const markDoneMutation = useMutation({
    mutationFn: (commId: string) => markFollowUpDone(commId, tenantId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow_ups_due', tenantId] });
      showToast('Follow-up cleared', 'success');
    }
  });

  const leads = allPreBookings?.filter((pb: any) => ['enquiry', 'confirmed'].includes(pb.status)) || [];
  const awaitingDelivery = allPreBookings?.filter((pb: any) => ['ordered', 'in_transit'].includes(pb.status)) || [];

  const salesCount = trends?.salesCurrent || 0;
  const revenueCount = trends?.revenueCurrent || 0;
  const milestones = (achievementData?.milestones || []) as any[];
  
  // Find the next milestone (first one not fully completed)
  const nextMilestone = milestones.find(m => salesCount < m.sales_target || revenueCount < m.revenue_target) || milestones[milestones.length - 1] || {
    name: 'Silver Seller',
    sales_target: 10,
    revenue_target: 5000000
  };
  
  const renderKPI = (title: string, value: number | string, icon: React.ReactNode, trend?: number, link?: string, loading?: boolean) => {
    const isPositive = trend && trend > 0;
    const isNegative = trend && trend < 0;
    
    const content = (
      <Card className="p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:border-indigo-100 hover:shadow-md transition-all h-full flex flex-col justify-between">
        <div className="absolute -right-4 -top-4 w-16 h-16 bg-slate-50 rounded-full group-hover:bg-indigo-50 transition-colors z-0" />
        <div className="absolute right-3 top-3 text-slate-300 group-hover:text-indigo-200 transition-colors z-10 w-8 h-8 flex items-center justify-center">
          {icon}
        </div>
        
        <div className="relative z-10">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            {title}
          </h3>
          <div className="flex items-baseline gap-3">
             {loading ? <Skeleton className="h-10 w-16" /> : <div className="text-4xl font-bold text-slate-900 tracking-tight">{value}</div>}
             {!loading && trend !== undefined && (
               <div className={cn(
                 "flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded",
                 isPositive ? "text-emerald-700 bg-emerald-50" : isNegative ? "text-red-700 bg-red-50" : "text-slate-600 bg-slate-100"
               )}>
                 {isPositive ? <TrendingUp className="w-3 h-3" /> : isNegative ? <TrendingDown className="w-3 h-3" /> : null}
                 {Math.abs(trend)}{trend > 10 ? '%' : ''}
               </div>
             )}
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-50 relative z-10">
           <span className="text-[10px] font-bold tracking-widest text-slate-400 group-hover:text-indigo-600 transition-colors uppercase flex items-center gap-1">
             View Details <span>&rarr;</span>
           </span>
        </div>
      </Card>
    );

    return link ? <Link to={link} className="block outline-none">{content}</Link> : content;
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'phone_call': return <Phone className="w-4 h-4 text-slate-400" />;
      case 'whatsapp': return <MessageSquare className="w-4 h-4 text-slate-400" />;
      case 'email': return <Mail className="w-4 h-4 text-slate-400" />;
      case 'site_visit': return <Building className="w-4 h-4 text-slate-400" />;
      case 'in_person': return <User className="w-4 h-4 text-slate-400" />;
      default: return <FileText className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <PageWrapper title="Sales Dashboard">
      <div className="max-w-7xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Hello, {fullName || email?.split('@')[0]}</h1>
          </div>
          <div className="flex gap-3">
            <Link to="/sales/customers?new=true">
              <Button variant="secondary" className="rounded-full px-6 font-bold shadow-sm bg-white hover:bg-slate-50 border border-slate-200">+ New Lead</Button>
            </Link>
            <Link to="/sales/new">
              <Button className="rounded-full px-6 font-bold shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white">+ Record Sale</Button>
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {renderKPI("Total Customers", stats?.customers || 0, <User />, trends?.customerTrend, "/sales/customers", statsLoading || trendsLoading)}
          {renderKPI("Leads / Inquiries", leads.length, <Zap />, trends?.leadsTrend, "/sales/pre-bookings", pbLoading || trendsLoading)}
          {renderKPI("Active Inventory", inventoryStats?.in_stock || 0, <Building />, undefined, "/sales/inventory", invLoading)}
          {renderKPI("Awaiting Delivery", awaitingDelivery.length, <Clock />, undefined, "/sales/pre-bookings", pbLoading)}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-8">
            
            {/* Mission Critical */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  Mission Critical <span className="text-slate-400 font-medium text-sm">({followUps?.length || 0})</span>
                </h2>
                {followUps && followUps.length > 0 && (
                  <Link to="/sales/customers" className="text-xs font-bold text-indigo-600 uppercase tracking-widest hover:text-indigo-700">View All</Link>
                )}
              </div>
              
              {foLoading ? (
                <Skeleton className="h-32 w-full rounded-2xl" />
              ) : !followUps || followUps.length === 0 ? (
                <div className="bg-slate-50 border border-slate-100 border-dashed rounded-3xl p-8 text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-slate-500 font-medium text-sm">All follow-ups cleared. Good job!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {followUps.slice(0, 4).map((fu: any) => {
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    const isOverdue = new Date(fu.follow_up_date) < today;

                    return (
                      <Card key={fu.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-200">
                        <div className="flex items-start gap-4">
                          <div className="p-2.5 bg-slate-100 rounded-full shrink-0">
                            {renderIcon(fu.interaction_type)}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <Link to={`/sales/customers/${fu.customer_id}`} className="font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                                {fu.customer?.name}
                              </Link>
                              {isOverdue ? (
                                <Badge variant="error" className="text-[9px] uppercase font-bold tracking-wider rounded-md py-0 px-1.5">Overdue</Badge>
                              ) : (
                                <Badge variant="warning" className="text-[9px] uppercase font-bold tracking-wider rounded-md py-0 px-1.5">Today</Badge>
                              )}
                            </div>
                            <div className="text-sm text-slate-600 font-medium">{fu.notes}</div>
                            {fu.pre_booking && <div className="text-[11px] font-bold text-indigo-500 mt-1 uppercase tracking-wider">Re: {fu.pre_booking.variant?.name}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="bg-white hover:bg-slate-50 border border-slate-200 shadow-sm font-bold text-xs rounded-full px-4"
                            onClick={() => markDoneMutation.mutate(fu.id)} 
                            disabled={markDoneMutation.isPending}
                          >
                            Mark Done
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Recent Wins */}
            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  Recent Wins
                </h2>
                <Link to="/sales/vehicles" className="text-xs font-bold text-indigo-600 uppercase tracking-widest hover:text-indigo-700">View All</Link>
              </div>
              
              <Card className="border border-slate-100 shadow-sm overflow-hidden rounded-2xl">
                {recentLoading ? (
                  <div className="p-4 space-y-4">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : recentSales && recentSales.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {recentSales.map((v: any) => (
                      <div key={v.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <User className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-slate-900 truncate">{v.customer?.name}</h4>
                          <div className="text-xs font-medium text-slate-500 truncate flex items-center gap-1.5">
                            {v.variant?.model?.manufacturer} {v.variant?.name}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-indigo-600 tracking-tight">{v.vehicle_number}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {new Date(v.sale_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-sm font-medium text-slate-500">
                    No recent sales found. Time to close some deals!
                  </div>
                )}
              </Card>
            </section>
          </div>

          <div className="space-y-8">
            
            {/* Achievements */}
            <section>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-amber-500" />
                Achievements
              </h2>
              
              <Card className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-5 border-0 shadow-lg relative overflow-hidden rounded-2xl mb-4 group/card">
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover/card:scale-110 transition-transform duration-500" />
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-indigo-200/80 flex items-center gap-1.5 mb-1">
                      <Target className="w-3 h-3" /> Next Milestone
                    </h4>
                    <div className="text-3xl font-black tracking-tight flex items-center gap-2">
                       {nextMilestone.name}
                       <div className="hidden group-hover/card:flex absolute top-12 left-5 bg-white text-slate-900 text-[10px] px-2 py-1 rounded shadow-xl font-bold border border-slate-100 z-50 whitespace-nowrap animate-in fade-in zoom-in duration-200">
                         Target: {nextMilestone.sales_target} Sales & ₹{Math.round(nextMilestone.revenue_target / 100000)}L Revenue
                       </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-bold text-indigo-200/50 uppercase tracking-widest">Current Status</div>
                    <div className="text-xs font-bold text-emerald-400">
                      {salesCount >= nextMilestone.sales_target && revenueCount >= nextMilestone.revenue_target ? 'Milestone Reached! 🏆' : 'On Track 🚀'}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-6 relative">
                  {/* Timeline pointer - visual line connecting them */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 bg-indigo-500/20 hidden md:block" />

                  <div className="group/metric">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-100/70">Sales Volume</span>
                      <span className="text-lg font-black text-white">{salesCount} <span className="text-indigo-300 font-bold text-xs">/ {nextMilestone.sales_target}</span></span>
                    </div>
                    <div className="h-2 bg-indigo-900/40 rounded-full overflow-hidden p-0.5 backdrop-blur-sm relative">
                      <div className="h-full bg-white rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(255,255,255,0.5)] relative" style={{ width: `${Math.min((salesCount / nextMilestone.sales_target) * 100, 100)}%` }}>
                        <div className="absolute right-0 top-0 h-full w-1 bg-indigo-400 group-hover/metric:animate-pulse" />
                      </div>
                    </div>
                  </div>

                  <div className="group/metric">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-100/70">Revenue Target</span>
                      <span className="text-lg font-black text-white">₹{Math.round(revenueCount / 100000)}L <span className="text-indigo-300 font-bold text-xs">/ {Math.round(nextMilestone.revenue_target / 100000)}L</span></span>
                    </div>
                    <div className="h-2 bg-indigo-900/40 rounded-full overflow-hidden p-0.5 backdrop-blur-sm relative">
                      <div className="h-full bg-emerald-400 rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(52,211,153,0.5)] relative" style={{ width: `${Math.min((revenueCount / nextMilestone.revenue_target) * 100, 100)}%` }}>
                        <div className="absolute right-0 top-0 h-full w-1 bg-white group-hover/metric:animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-indigo-500/30 flex items-center gap-3">
                  <div className="p-1.5 bg-white/10 rounded-lg">
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                  <p className="text-[11px] font-medium italic text-indigo-100 leading-tight">
                    "{achievementData?.config?.quote || 'Consistency is the playground of the foundation of the champion.'}"
                  </p>
                </div>
              </Card>
              
              <div className="mb-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 pl-1">Achievements & Badges</h4>
                <div className="flex flex-wrap gap-2">
                  {/* Local badges or from DB? Let's show from DB if available, otherwise defaults */}
                  {milestones.length > 0 ? milestones.map((m, idx) => {
                    const isUnlocked = salesCount >= m.sales_target && revenueCount >= m.revenue_target;
                    return (
                      <div key={idx} className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-default group/badge relative",
                        isUnlocked ? "bg-white border-emerald-100 shadow-sm" : "bg-slate-50 border-slate-100 opacity-60 grayscale"
                      )}>
                        <div className={cn(
                          "w-7 h-7 rounded-full flex items-center justify-center",
                          isUnlocked ? "bg-amber-100 text-amber-600" : "bg-slate-200 text-slate-400"
                        )}>
                          {m.badge_icon === 'Award' && <Award className="w-4 h-4" />}
                          {m.badge_icon === 'Target' && <Target className="w-4 h-4" />}
                          {m.badge_icon === 'TrendingUp' && <TrendingUp className="w-4 h-4" />}
                          {m.badge_icon === 'Zap' && <Zap className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-900 leading-none">{m.name}</div>
                          <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{m.sales_target} Sales</div>
                        </div>
                        <div className="hidden group-hover/badge:block absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-2 py-1 rounded shadow-xl whitespace-nowrap z-50">
                          Targets: {m.sales_target} Sales / ₹{Math.round(m.revenue_target / 100000)}L
                        </div>
                      </div>
                    );
                  }) : (
                    <>
                      {/* Fallback to Rookie if no milestones defined */}
                      <div className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-default group/badge relative",
                        salesCount >= 1 ? "bg-white border-emerald-100 shadow-sm" : "bg-slate-50 border-slate-100 opacity-60 grayscale"
                      )}>
                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center bg-amber-100 text-amber-600")}>
                          <Award className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-900 leading-none">Rookie</div>
                          <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">1st Sale</div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </section>


          </div>
          
        </div>
      </div>
    </PageWrapper>
  );
}

