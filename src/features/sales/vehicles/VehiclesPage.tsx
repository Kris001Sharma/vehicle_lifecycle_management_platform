import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/features/auth/store/authStore';
import { searchVehicles } from '@/lib/db/vehicles';
import { useDebounce } from '@/hooks/useDebounce';
import { Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase/client';

export function VehiclesPage() {
  const { tenantId } = useAuthStore(s => s.user!) || {};
  const navigate = useNavigate();
  
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  const debouncedSearch = useDebounce(search, 300);
  const pageSize = 20;

  const { data: categories } = useQuery({
    queryKey: ['vehicle_categories', tenantId],
    queryFn: async () => {
      const { data } = await supabase.from('vehicle_categories').select('id, name').order('name');
      return data || [];
    },
    enabled: !!tenantId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['vehicles', tenantId, debouncedSearch, page],
    queryFn: async () => {
      try {
        return await searchVehicles(debouncedSearch, tenantId!, page, pageSize);
      } catch (err) {
        console.error("Vehicles search error:", err);
        throw err;
      }
    },
    enabled: !!tenantId,
  });

  const filteredRows = data?.rows.filter((v: any) => {
    if (statusFilter !== 'All') {
      const status = (v.status || 'active').toLowerCase();
      const isArchived = !!v.is_archived;
      
      if (statusFilter === 'Archived') {
        if (!isArchived) return false;
      } else if (status !== statusFilter.toLowerCase() || isArchived) {
        return false;
      }
    }
    if (categoryFilter !== 'All' && v.category_name !== categoryFilter) {
      return false;
    }
    return true;
  }) || [];

  return (
    <PageWrapper
      title="Vehicles"
      actions={
        <Button 
          onClick={() => navigate('/sales/vehicles/new')}
          className="h-10 px-5"
        >
          + Record Sale
        </Button>
      }
    >
      <div className="mb-6 space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search vehicles..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          
          <select
            className="bg-white border border-slate-200 rounded-md text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-48 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236B7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_0.5rem_center] bg-no-repeat"
            value={categoryFilter}
            onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          >
            <option value="All">All categories</option>
            {categories?.map((c: any) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex border-b border-slate-200 min-w-0">
          {['All', 'Active', 'Transferred', 'Archived'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`flex-1 whitespace-nowrap px-2 sm:px-4 py-2 border-b-2 font-semibold text-[10px] sm:text-xs uppercase tracking-wider transition-colors text-center ${
                statusFilter === s
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="sm:hidden space-y-3 pb-6">
        {isLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
        ) : filteredRows.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">No vehicles found.</div>
        ) : (
          filteredRows.map((v: any) => (
            <Link 
              key={v.id} 
              to={`/sales/vehicles/${v.id}`}
              className="block bg-white p-4 rounded-xl border border-slate-200 shadow-sm active:bg-slate-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-mono font-bold text-slate-900 text-xs tracking-wider">{v.vehicle_number}</div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">{v.manufacturer} {v.model_name}</div>
                </div>
                <Badge 
                  variant={v.status === 'active' ? 'success' : v.status === 'transferred' ? 'neutral' : 'error'}
                  className="px-1.5 py-0 font-bold uppercase tracking-wider text-[9px] border-0"
                >
                  {v.status}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-[10px] font-medium text-slate-500 pt-2 border-t border-slate-50">
                <div className="flex gap-2">
                   <span className="bg-slate-100 px-1.5 rounded-sm uppercase tracking-tighter text-[9px] font-bold text-slate-600">{v.powertrain_display_label}</span>
                   <span className="truncate max-w-[100px]">{v.customer_name}</span>
                </div>
                <div className={new Date(v.next_service_date) < new Date() ? 'text-red-500 font-bold' : ''}>
                  Due: {v.next_service_date ? new Date(v.next_service_date).toLocaleDateString() : '-'}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <Card className="hidden sm:block border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Vehicle No.</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Model</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Powertrain</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sale date</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Service due</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="relative px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(8)].map((_, j) => (
                      <td key={j} className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-16" /></td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-right"><Skeleton className="h-4 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                    {debouncedSearch || statusFilter !== 'All' || categoryFilter !== 'All' 
                      ? "No vehicles match your search or filters." 
                      : "No vehicles recorded yet."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((v: any) => {
                  return (
                    <tr key={v.id} className="hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-0">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-800 tracking-tight">{v.vehicle_number}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-900">{v.manufacturer}</div>
                        <div className="text-[11px] font-medium text-slate-500">{v.model_name}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-medium text-slate-600">{v.subcategory || v.category_name}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant="neutral" className="bg-slate-100 text-slate-600 font-semibold text-[10px] uppercase tracking-wider border-0 px-2 py-0.5">{v.powertrain_display_label}</Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-700">{v.customer_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-[12px] text-slate-500">{new Date(v.sale_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-[12px] text-slate-500">
                        {v.next_service_date ? (
                          <span className={new Date(v.next_service_date) < new Date() ? 'text-red-600 font-bold' : 'font-medium text-slate-600'}>
                            {new Date(v.next_service_date).toLocaleDateString()}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {v.is_archived ? <Badge variant="warning" className="px-2 py-0.5 font-semibold border-0 bg-amber-50 text-amber-700 text-[10px] uppercase tracking-wider">Archived</Badge> : (
                          <Badge 
                            variant={v.status === 'active' ? 'success' : v.status === 'transferred' ? 'neutral' : 'error'}
                            className="px-2 py-0.5 font-semibold border-0 uppercase tracking-wider text-[10px]"
                          >
                            {v.status}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <Link to={`/sales/vehicles/${v.id}`} className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-semibold text-xs uppercase tracking-wider">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {data && data.totalCount > pageSize && !search && statusFilter === 'All' && categoryFilter === 'All' && (
          <div className="px-4 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, data.totalCount)} of {data.totalCount}
            </span>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="secondary" size="sm" className="flex-1 sm:flex-none h-8 text-[10px] font-bold uppercase tracking-wider" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
              <Button variant="secondary" size="sm" className="flex-1 sm:flex-none h-8 text-[10px] font-bold uppercase tracking-wider" onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= data.totalCount}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}
