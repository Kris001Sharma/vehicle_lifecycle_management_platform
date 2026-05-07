import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/features/auth/store/authStore';
import { supabase } from '@/lib/supabase/client';
import { getInventorySummary } from '@/lib/db/inventory';
import { getPreBookings } from '@/lib/db/preBookings';
import { getCriticalFollowUps, markFollowUpDone } from '@/lib/db/communications';
import { getDashboardTrends } from '@/lib/db/dashboard';
import { useToast } from '@/hooks/useToast';
import { Phone, MessageSquare, Mail, Building, User, FileText, TrendingUp, TrendingDown, CheckCircle2, Clock, Zap, Award, Target, Trophy, IndianRupee } from 'lucide-react';
import { cn } from '@/utils/cn';

export function SalesDashboard() {
  const navigate = useNavigate();
  const { tenantId, id: userId, email, fullName } = useAuthStore(s => s.user!) || {};
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
    queryKey: ['follow_ups_critical', tenantId],
    queryFn: () => getCriticalFollowUps(tenantId!),
    enabled: !!tenantId,
  });

  const { data: achievementData } = useQuery({
    queryKey: ['achievement_config', tenantId],
    queryFn: async () => {
      const [milestoneRes, configRes] = await Promise.all([
        (supabase as any).from('achievement_milestones').select('*').eq('tenant_id', tenantId).order('order_index', { ascending: true }),
        (supabase as any).from('tenant_achievement_config').select('*').eq('tenant_id', tenantId).maybeSingle()
      ]);
      return { 
        milestones: (milestoneRes.data || []) as any[], 
        config: (configRes.data || { quote: "Consistency is the playground of the foundation of the champion." }) as any 
      };
    },
    enabled: !!tenantId,
  });

  const markDoneMutation = useMutation({
    mutationFn: (commId: string) => markFollowUpDone(commId, tenantId!, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow_ups_critical', tenantId] });
      showToast('Follow-up cleared', 'success');
    }
  });

  // Identify Mission Critical Items
  const criticalItems = (() => {
    const items: any[] = [];
    
    // 1. Follow-ups
    if (followUps) {
      followUps.forEach((fu: any) => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const fuDate = new Date(fu.follow_up_date);
        
        let priority = 'upcoming';
        if (fuDate < today) priority = 'overdue';
        else if (fuDate.getTime() === today.getTime()) priority = 'today';

        items.push({
          type: 'followup',
          priority,
          date: fu.follow_up_date,
          title: fu.customer?.name,
          subtitle: fu.notes,
          id: fu.id,
          meta: fu.pre_booking?.variant?.name,
          interaction: fu.interaction_type,
          customerId: fu.customer_id
        });
      });
    }

    // 2. Pending Deposits for confirmed/ordered bookings
    if (allPreBookings) {
      allPreBookings.forEach((pb: any) => {
        if (!pb.deposit_received && ['confirmed', 'ordered', 'in_transit'].includes(pb.status)) {
          items.push({
            type: 'finance',
            priority: 'medium',
            title: pb.customer?.name,
            subtitle: `Deposit Pending for ${pb.variant?.name}`,
            meta: `Status: ${pb.status.replace('_', ' ')}`,
            id: pb.id,
            customerId: pb.customer_id
          });
        }
      });
    }

    // Sort: Overdue first, then Today, then Finance, then Upcoming
    return items.sort((a, b) => {
      const pOrder: any = { overdue: 0, today: 1, medium: 2, upcoming: 3 };
      return pOrder[a.priority] - pOrder[b.priority];
    });
  })();

  const leads = allPreBookings?.filter((pb: any) => ['enquiry', 'confirmed'].includes(pb.status)) || [];
  const awaitingDelivery = allPreBookings?.filter((pb: any) => ['ordered', 'in_transit'].includes(pb.status)) || [];

  const salesCount = trends?.salesCurrent || 0;
  const revenueCount = trends?.revenueCurrent || 0;
  const milestones = (achievementData?.milestones || []) as any[];
  
  const isMilestoneCompleted = (m: any) => {
    const salesPass = !m.sales_target || salesCount >= m.sales_target;
    const revenuePass = !m.revenue_target || revenueCount >= m.revenue_target;
    return salesPass && revenuePass;
  };

  // Find the next milestone (first one not fully completed)
  const nextMilestone = milestones.find(m => !isMilestoneCompleted(m)) || milestones[milestones.length - 1] || {
    name: 'Ignition',
    sales_target: 1,
    revenue_target: 0,
    badge_color: 'amber'
  };

  const getMilestoneTheme = (color: string) => {
    switch (color) {
      case 'slate': // Silver
        return {
          card: "bg-gradient-to-br from-slate-400 via-slate-200 to-slate-500 text-slate-900 border-slate-300",
          accent: "bg-slate-900/10",
          progressBg: "bg-slate-900/20",
          progressBar: "bg-slate-900",
          textSecondary: "text-slate-700",
          badge: "bg-slate-200 text-slate-700 border-slate-300"
        };
      case 'yellow': // Gold
        return {
          card: "bg-gradient-to-br from-amber-300 via-yellow-100 to-amber-500 text-amber-900 border-amber-400",
          accent: "bg-amber-900/10",
          progressBg: "bg-amber-900/20",
          progressBar: "bg-amber-900",
          textSecondary: "text-amber-700",
          badge: "bg-amber-100 text-amber-700 border-amber-300"
        };
      case 'indigo': // Platinum
        return {
          card: "bg-gradient-to-br from-slate-600 via-indigo-900 to-slate-900 text-white border-indigo-500/30",
          accent: "bg-white/10",
          progressBg: "bg-indigo-950/50",
          progressBar: "bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]",
          textSecondary: "text-indigo-200",
          badge: "bg-indigo-500/20 text-indigo-100 border-indigo-400/30"
        };
      case 'cyan': // Diamond
        return {
          card: "bg-gradient-to-br from-sky-400 via-blue-50 to-indigo-400 text-blue-900 border-blue-200",
          accent: "bg-blue-900/10",
          progressBg: "bg-blue-900/10",
          progressBar: "bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.4)]",
          textSecondary: "text-blue-700",
          badge: "bg-white/50 text-blue-700 border-blue-200"
        };
      case 'purple': // Godfather / Boss
        return {
          card: "bg-gradient-to-br from-gray-900 via-slate-800 to-black text-white border-emerald-500/20",
          accent: "bg-emerald-500/10",
          progressBg: "bg-black/50",
          progressBar: "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.4)]",
          textSecondary: "text-slate-400",
          badge: "bg-emerald-500/20 text-emerald-400 border-emerald-400/30"
        };
      default: // Amber / Rookie
        return {
          card: "bg-gradient-to-br from-indigo-600 to-indigo-800 text-white border-0",
          accent: "bg-white/10",
          progressBg: "bg-indigo-900/40",
          progressBar: "bg-white",
          textSecondary: "text-indigo-200",
          badge: "bg-white/10 text-white"
        };
    }
  };

  const theme = getMilestoneTheme(nextMilestone.badge_color || 'amber');
  
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
                  Mission Critical <span className="text-slate-400 font-medium text-sm">({criticalItems.length})</span>
                </h2>
                {criticalItems.length > 0 && (
                  <Link to="/sales/customers" className="text-xs font-bold text-indigo-600 uppercase tracking-widest hover:text-indigo-700">View CRM</Link>
                )}
              </div>
              
              {foLoading || pbLoading ? (
                <Skeleton className="h-32 w-full rounded-2xl" />
              ) : criticalItems.length === 0 ? (
                <div className="bg-slate-50 border border-slate-100 border-dashed rounded-3xl p-8 text-center">
                  <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-slate-500 font-medium text-sm">All follow-ups cleared. Good job!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {criticalItems.slice(0, 6).map((item: any) => {
                    const isFollowUp = item.type === 'followup';
                    const isOverdue = item.priority === 'overdue';
                    const isToday = item.priority === 'today';
                    const isFinance = item.type === 'finance';

                    const handleClick = () => {
                      const tab = isFinance ? 'pre-bookings' : 'communications';
                      navigate(`/sales/customers/${item.customerId}?tab=${tab}`);
                    };

                    return (
                      <div 
                        key={`${item.type}-${item.id}`} 
                        onClick={handleClick}
                        className={cn(
                          "group relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden",
                          "bg-white hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 active:scale-[0.98]",
                          isOverdue ? "border-red-100 hover:border-red-200" : 
                          isToday ? "border-amber-100 hover:border-amber-200" : 
                          isFinance ? "border-purple-100 hover:border-purple-200" : 
                          "border-slate-100 hover:border-indigo-100"
                        )}
                      >
                        {/* Status Accent Line */}
                        <div className={cn(
                          "absolute left-0 top-0 bottom-0 w-1",
                          isOverdue ? "bg-red-500" : isToday ? "bg-amber-500" : isFinance ? "bg-purple-500" : "bg-indigo-300"
                        )} />

                        <div className="flex items-start gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-110 duration-300 shadow-sm",
                            isOverdue ? "bg-red-50 text-red-600" : 
                            isToday ? "bg-amber-50 text-amber-600" : 
                            isFinance ? "bg-purple-50 text-purple-600" : 
                            "bg-slate-50 text-indigo-500"
                          )}>
                            {isFinance ? <IndianRupee className="w-5 h-5" /> : renderIcon(item.interaction)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h3 className="font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                                {item.title}
                              </h3>
                              {isOverdue && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-red-600 px-1.5 py-0.5 bg-red-50 rounded">Alert</span>
                              )}
                            </div>
                            
                            <p className="text-xs text-slate-500 font-medium line-clamp-1 group-hover:text-slate-700 transition-colors">
                              {item.subtitle}
                            </p>

                            <div className="flex items-center flex-wrap gap-2 mt-2">
                              {isFinance ? (
                                <Badge className="text-[9px] uppercase font-bold tracking-wider rounded-md py-0 px-1.5 bg-purple-100 text-purple-700 border-purple-200/50">
                                  Finance Recall
                                </Badge>
                              ) : (
                                <Badge variant="neutral" className={cn(
                                  "text-[9px] uppercase font-bold tracking-wider rounded-md py-0 px-1.5",
                                  isOverdue ? "bg-red-100/50 text-red-700 border-red-200/50" : 
                                  isToday ? "bg-amber-100/50 text-amber-700 border-amber-200/50" : 
                                  "bg-indigo-50 text-indigo-600 border-indigo-100/50"
                                )}>
                                  {isOverdue ? 'Overdue' : isToday ? 'Due Today' : 'Follow Up'}
                                </Badge>
                              )}
                              
                              {item.meta && (
                                <span className="text-[10px] font-bold text-slate-400 capitalize truncate max-w-[120px]">
                                  • {item.meta.toLowerCase()}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Complete Button Overlay for Follow-ups */}
                        {isFollowUp && (
                          <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="h-7 px-3 text-[10px] font-bold bg-white/90 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 border-slate-200 shadow-sm rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                markDoneMutation.mutate(item.id);
                              }} 
                              disabled={markDoneMutation.isPending}
                            >
                              Resolve
                            </Button>
                          </div>
                        )}
                        
                        {/* Subtle Chevron indicator */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1">
                          <Zap className="w-3 h-3" />
                        </div>
                      </div>
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
              
              <Card className={cn("p-5 shadow-lg relative overflow-hidden rounded-2xl mb-4 group/card transition-all duration-500 border", theme.card)}>
                <div className={cn("absolute right-0 top-0 w-32 h-32 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 group-hover/card:scale-110 transition-transform duration-500", theme.accent)} />
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h4 className={cn("text-[10px] uppercase tracking-[0.2em] font-bold flex items-center gap-1.5 mb-1", theme.textSecondary)}>
                      <Target className="w-3 h-3" /> Next Milestone
                    </h4>
                    <div className="text-3xl font-black tracking-tight flex items-center gap-2">
                       {nextMilestone.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn("text-[10px] font-bold uppercase tracking-widest", theme.textSecondary)}>Current Status</div>
                    <div className={cn("text-xs font-bold", isMilestoneCompleted(nextMilestone) ? "text-emerald-500" : "text-white/80")}>
                      {isMilestoneCompleted(nextMilestone) ? 'Milestone Reached! 🏆' : 'On Track 🚀'}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                  {/* Timeline pointer - visual line connecting them */}
                  {nextMilestone.sales_target > 0 && nextMilestone.revenue_target > 0 && (
                    <div className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 hidden md:block", theme.accent)} />
                  )}

                  {nextMilestone.sales_target > 0 && (
                    <div className="group/metric">
                      <div className="flex justify-between items-end mb-2">
                        <span className={cn("text-[11px] font-bold uppercase tracking-wider", theme.textSecondary)}>Sales Volume</span>
                        <span className="text-lg font-black">{salesCount} <span className={cn("font-bold text-xs", theme.textSecondary)}>/ {nextMilestone.sales_target}</span></span>
                      </div>
                      <div className={cn("h-2 rounded-full overflow-hidden p-0.5 backdrop-blur-sm relative", theme.progressBg)}>
                        <div className={cn("h-full rounded-full transition-all duration-1000 relative", theme.progressBar)} style={{ width: `${Math.min((salesCount / nextMilestone.sales_target) * 100, 100)}%` }}>
                          <div className={cn("absolute right-0 top-0 h-full w-1 group-hover/metric:animate-pulse", theme.progressBar)} />
                        </div>
                      </div>
                    </div>
                  )}

                  {nextMilestone.revenue_target > 0 && (
                    <div className="group/metric">
                      <div className="flex justify-between items-end mb-2">
                        <span className={cn("text-[11px] font-bold uppercase tracking-wider", theme.textSecondary)}>Revenue Target</span>
                        <span className="text-lg font-black text-inherit">₹{Math.round(revenueCount / 100000)}L <span className={cn("font-bold text-xs", theme.textSecondary)}>/ {Math.round(nextMilestone.revenue_target / 100000)}L</span></span>
                      </div>
                      <div className={cn("h-2 rounded-full overflow-hidden p-0.5 backdrop-blur-sm relative", theme.progressBg)}>
                        <div className={cn("h-full rounded-full transition-all duration-1000 relative", theme.progressBar)} style={{ width: `${Math.min((revenueCount / nextMilestone.revenue_target) * 100, 100)}%` }}>
                          <div className={cn("absolute right-0 top-0 h-full w-1 bg-white group-hover/metric:animate-pulse")} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className={cn("mt-6 pt-4 border-t flex items-center gap-3", theme.card.includes('from-indigo') ? 'border-indigo-400/30' : 'border-black/5')}>
                  <div className={cn("p-1.5 rounded-lg", theme.accent)}>
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                  </div>
                  <p className={cn("text-[11px] font-medium italic leading-tight", theme.textSecondary)}>
                    "{achievementData?.config?.quote || 'Consistency is the playground of the foundation of the champion.'}"
                  </p>
                </div>
              </Card>
              
              <div className="mb-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 pl-1">Achievements & Badges</h4>
                <div className="flex flex-wrap gap-2">
                  {milestones.length > 0 ? milestones.map((m, idx) => {
                    const isUnlocked = isMilestoneCompleted(m);
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
                          <div className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                            {m.sales_target > 0 && `${m.sales_target} Sales`}
                            {m.sales_target > 0 && m.revenue_target > 0 && ' + '}
                            {m.revenue_target > 0 && `₹${Math.round(m.revenue_target / 100000)}L`}
                          </div>
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

