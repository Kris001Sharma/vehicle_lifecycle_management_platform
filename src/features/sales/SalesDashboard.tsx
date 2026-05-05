import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/features/auth/store/authStore';
import { supabase } from '@/lib/supabase/client';
import { getVehiclesDueForService } from '@/lib/db/vehicles';

export function SalesDashboard() {
  const { tenantId } = useAuthStore(s => s.user!) || {};

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['sales_stats', tenantId],
    queryFn: async () => {
      const [{ count: custCount }, { count: vehCount }] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      ]);
      return { customers: custCount || 0, vehicles: vehCount || 0 };
    },
    enabled: !!tenantId,
  });

  const { data: dueService, isLoading: dueLoading } = useQuery({
    queryKey: ['sales_service_due', tenantId],
    queryFn: () => getVehiclesDueForService(tenantId!, 30),
    enabled: !!tenantId,
  });

  const { data: recentSales, isLoading: recentLoading } = useQuery({
    queryKey: ['sales_recent', tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from('vehicles')
        .select(`
          id, vehicle_number, sale_date,
          model:vehicle_models(name, manufacturer),
          customer:customers(name)
        `)
        .eq('tenant_id', tenantId)
        .order('sale_date', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!tenantId,
  });

  return (
    <PageWrapper title="Sales">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Total customers</h3>
          {statsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold text-slate-900">{stats?.customers}</div>}
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Total vehicles sold</h3>
          {statsLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold text-slate-900">{stats?.vehicles}</div>}
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Vehicles due for service this month</h3>
          {dueLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-3xl font-bold text-slate-900">{dueService?.length || 0}</div>}
        </Card>
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
                <div key={v.id} className="flex justify-between items-center pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                  <div>
                    <div className="font-mono text-sm font-medium text-slate-900">{v.vehicle_number}</div>
                    <div className="text-xs text-slate-500">{v.model?.manufacturer} {v.model?.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-900">{v.customer?.name}</div>
                    <div className="text-xs text-slate-500">{new Date(v.sale_date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500 text-center py-4">No recent sales.</div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Service due soon</h3>
            <Link to="/sales/vehicles" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">View all</Link>
          </div>
          {dueLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : dueService && dueService.length > 0 ? (
            <div className="space-y-4">
              {dueService.slice(0, 5).map((v: any) => {
                const isOverdue = v.next_service_date && new Date(v.next_service_date) < new Date();
                const isWithin7 = v.next_service_date && new Date(v.next_service_date) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                const colorClass = isOverdue ? 'text-red-600 font-medium' : isWithin7 ? 'text-amber-600' : 'text-slate-900';
                return (
                  <div key={v.id} className="flex justify-between items-center pb-4 border-b border-slate-100 last:border-0 last:pb-0">
                    <div>
                      <div className="font-mono text-sm font-medium text-slate-900">{v.vehicle_number}</div>
                      <div className="text-xs text-slate-500">{v.customer?.name}</div>
                    </div>
                    <div className={`text-sm ${colorClass}`}>
                      {v.next_service_date ? new Date(v.next_service_date).toLocaleDateString() : 'Not scheduled'}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-slate-500 text-center py-4">No vehicles due for service soon.</div>
          )}
        </Card>
      </div>
    </PageWrapper>
  );
}
