import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/features/auth/store/authStore';
import { supabase } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

export function HistoryPage() {
  const { user } = useAuthStore();
  const tenantId = user?.tenantId;
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchTerm, 400);

  const { data, isLoading } = useQuery({
    queryKey: ['service_history_all', debouncedSearch, page, tenantId],
    queryFn: async () => {
      // Create a query to service records filtering by vehicle_id derived from search
      let vehicleIds: string[] | null = null;
      if (debouncedSearch.trim()) {
        const custq = `%${debouncedSearch}%`;
        const { data: custs } = await supabase.from('customers')
          .select('id').eq('tenant_id', tenantId!)
          .or(`name.ilike.${custq},phone.ilike.${custq}`);
        const cids = custs?.map((c: any) => c.id) || [];
        
        let vq = supabase.from('vehicles').select('id').eq('tenant_id', tenantId!);
        let orstr = `vehicle_number.ilike.${custq},registration_plate.ilike.${custq}`;
        if (cids.length > 0) orstr += `,customer_id.in.(${cids.join(',')})`;
        
        const { data: v } = await vq.or(orstr);
        if (v && v.length > 0) {
          vehicleIds = v.map((vi: any) => vi.id);
        } else {
          return { records: [], totalCount: 0, totalPages: 0 };
        }
      }

      let q = supabase.from('service_records')
        .select(`*, vehicle:vehicles(vehicle_number, customer:customers(name))`, { count: 'exact' })
        .eq('tenant_id', tenantId!)
        .order('visit_date', { ascending: false });

      if (vehicleIds && vehicleIds.length > 0) {
        q = q.in('vehicle_id', vehicleIds);
      }

      const { data: recs, count } = await q.range((page - 1) * 20, page * 20 - 1);
      return { records: recs || [], totalCount: count || 0, totalPages: Math.ceil((count || 0) / 20) };
    },
    enabled: !!tenantId
  });

  return (
    <PageWrapper title="Service history">
      <div className="mb-6 relative max-w-lg">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Search by vehicle number or customer"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-4">
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
             <Skeleton className="h-10 w-full" />
          </div>
        ) : data && data.records.length > 0 ? (
          <div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vehicle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {data.records.map((r: any) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 font-mono">
                        {r.vehicle?.vehicle_number}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {r.vehicle?.customer?.name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                        {format(new Date(r.visit_date), 'dd MMM yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="px-2 py-0.5 uppercase tracking-wider text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded-full">
                          {r.visit_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                          r.status === 'open' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                          onClick={() => navigate(`/service/vehicle/${r.vehicle_id}`)}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {data.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
                 <div className="text-sm text-slate-500">
                    Page {page} of {data.totalPages}
                 </div>
                 <div className="flex gap-2">
                   <Button variant="ghost" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}>
                     <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                   </Button>
                   <Button variant="ghost" size="sm" onClick={() => setPage(Math.min(data.totalPages, page + 1))} disabled={page === data.totalPages}>
                     Next <ChevronRight className="w-4 h-4 ml-1" />
                   </Button>
                 </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">
            No service history found.
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}
