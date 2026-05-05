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
          className="h-11 px-6 shadow-lg shadow-indigo-200"
        >
          + Record Sale
        </Button>
      }
    >
      <div className="mb-4 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Search by vehicle number, plate, chassis or customer name"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex bg-slate-100 p-1 rounded-md">
          {['All', 'Active', 'Transferred', 'Archived'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${statusFilter === s ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {s}
            </button>
          ))}
        </div>
        
        <select
          className="bg-white border border-slate-200 rounded-md text-sm py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
        >
          <option value="All">All categories</option>
          {categories?.map((c: any) => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vehicle No.</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Model</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Powertrain</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Sale date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Service due</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
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
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono font-medium text-slate-900">{v.vehicle_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-slate-900">{v.manufacturer}</div>
                        <div className="text-sm text-slate-500">{v.model_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="neutral" className="bg-slate-100 text-xs border-none">{v.subcategory || v.category_name}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="neutral" className="bg-slate-100 text-[10px] uppercase tracking-wider border-none">{v.powertrain_display_label}</Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{v.customer_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{new Date(v.sale_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        -
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {v.is_archived ? <Badge variant="warning">Archived</Badge> : (
                          <Badge variant={v.status === 'active' ? 'success' : v.status === 'transferred' ? 'neutral' : 'error'}>
                            {v.status}
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link to={`/sales/vehicles/${v.id}`} className="text-indigo-600 hover:text-indigo-900">
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
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, data.totalCount)} of {data.totalCount} vehicles
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
              <Button variant="secondary" size="sm" onClick={() => setPage(p => p + 1)} disabled={page * pageSize >= data.totalCount}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}
