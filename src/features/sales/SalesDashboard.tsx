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
import { useToast } from '@/hooks/useToast';
import { Phone, MessageSquare, Mail, Building, User, FileText } from 'lucide-react';

export function SalesDashboard() {
  const { tenantId } = useAuthStore(s => s.user!) || {};
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['sales_stats', tenantId],
    queryFn: async () => {
      const [{ count: custCount }, { count: vehCount }] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      ]);
      return { customers: custCount || 0, vehicles: vehCount || 0 };
    },
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

  const { data: activePreBookings, isLoading: pbLoading } = useQuery({
    queryKey: ['pre_bookings_active', tenantId],
    queryFn: async () => {
      const all = await getPreBookings(tenantId!);
      return all?.filter((pb: any) => ['confirmed', 'ordered', 'in_transit'].includes(pb.status)) || [];
    },
    enabled: !!tenantId,
  });

  const { data: followUps, isLoading: foLoading } = useQuery({
    queryKey: ['follow_ups_due', tenantId],
    queryFn: () => getFollowUpsDueToday(tenantId!),
    enabled: !!tenantId,
  });

  const markDoneMutation = useMutation({
    mutationFn: (commId: string) => markFollowUpDone(commId, tenantId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['follow_ups_due', tenantId] });
      showToast('Follow-up marked as done', 'success');
    }
  });

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
    <PageWrapper title="Sales">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Total customers</h3>
          {statsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold text-slate-900">{stats?.customers}</div>}
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Total vehicles sold</h3>
          {statsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold text-slate-900">{stats?.vehicles}</div>}
        </Card>
        <Link to="/sales/inventory" className="block outline-none hover:ring-2 hover:ring-indigo-600 rounded-xl transition-all">
          <Card className="p-6 h-full transition-shadow hover:shadow-md">
            <h3 className="text-sm font-medium text-slate-500 mb-2">In stock</h3>
            {invLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold text-slate-900">{inventoryStats?.in_stock || 0}</div>}
          </Card>
        </Link>
        <Link to="/sales/pre-bookings" className="block outline-none hover:ring-2 hover:ring-indigo-600 rounded-xl transition-all">
          <Card className="p-6 h-full transition-shadow hover:shadow-md">
            <h3 className="text-sm font-medium text-slate-500 mb-2">Awaiting delivery</h3>
            {pbLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold text-slate-900">{activePreBookings?.length || 0}</div>}
          </Card>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 mb-8">
        {(!foLoading && followUps && followUps.length > 0) && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Follow-ups due</h2>
            <div className="space-y-3">
              {followUps.slice(0, 5).map((fu: any) => {
                const today = new Date();
                today.setHours(0,0,0,0);
                const isOverdue = new Date(fu.follow_up_date) < today;

                return (
                  <Card key={fu.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-slate-50 rounded-full shrink-0">
                        {renderIcon(fu.interaction_type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Link to={`/sales/customers/${fu.customer_id}`} onClick={() => setTimeout(() => window.dispatchEvent(new Event('hashchange')), 0)} className="font-semibold text-indigo-700 hover:underline">
                            {fu.customer?.name}
                          </Link>
                          <Badge variant={isOverdue ? 'error' : 'warning'} className="text-[10px] uppercase">
                            {isOverdue ? 'Overdue' : 'Today'}
                          </Badge>
                          {fu.pre_booking && <span className="text-xs text-slate-500">Re: {fu.pre_booking.variant?.name} booking</span>}
                        </div>
                        <div className="text-sm text-slate-600 line-clamp-1">{fu.notes.length > 60 ? fu.notes.substring(0, 60) + '...' : fu.notes}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => markDoneMutation.mutate(fu.id)} disabled={markDoneMutation.isPending}>
                        Mark done
                      </Button>
                      <Link to={`/sales/customers/${fu.customer_id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">Open customer →</Link>
                    </div>
                  </Card>
                );
              })}
              {followUps.length > 5 && (
                <Link to="/sales/customers" className="inline-block mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700">View all follow-ups →</Link>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Recent sales</h3>
            <Link to="/sales/vehicles" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View all</Link>
          </div>
          {recentLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : recentSales && recentSales.length > 0 ? (
            <div className="space-y-4">
              {recentSales.map((v: any) => (
                <Link 
                  key={v.id} 
                  to={`/sales/vehicles/${v.id}`}
                  className="flex justify-between items-center pb-4 border-b border-slate-100 last:border-0 last:pb-0 hover:bg-slate-50 transition-colors"
                >
                  <div>
                    <div className="font-mono text-sm font-medium text-slate-900">{v.vehicle_number}</div>
                    <div className="text-xs text-slate-500">
                      {v.variant?.model?.manufacturer} {v.variant?.model?.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-900">{v.customer?.name}</div>
                    <div className="text-xs text-slate-500">{new Date(v.sale_date).toLocaleDateString()}</div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500 text-center py-4">No recent sales.</div>
          )}
        </Card>
      </div>
    </PageWrapper>
  );
}
