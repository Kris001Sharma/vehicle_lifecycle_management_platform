import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/features/auth/store/authStore';
import { searchCustomers } from '@/lib/db/customers';
import { useDebounce } from '@/hooks/useDebounce';
import { Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export function CustomersPage() {
  const { tenantId } = useAuthStore(s => s.user!) || {};
  const navigate = useNavigate();
  
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['customers', tenantId, debouncedSearch, page],
    queryFn: () => searchCustomers(debouncedSearch, tenantId!, page, pageSize),
    enabled: !!tenantId,
  });

  const getBadgeColor = (type: string): 'neutral' | 'info' | 'success' | 'warning' => {
    switch (type) {
      case 'individual': return 'neutral';
      case 'fleet_owner': return 'info';
      case 'school': return 'success';
      case 'transporter': return 'warning';
      default: return 'neutral';
    }
  };

  return (
    <PageWrapper
      title="Customers"
      actions={
        <Button onClick={() => navigate('/sales/customers/new')}>
          + Add customer
        </Button>
      }
    >
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          placeholder="Search by name, phone or email"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Phone / City</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vehicles</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Added</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-8" /></td>
                    <td className="px-6 py-4 whitespace-nowrap"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : data?.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    {debouncedSearch ? "No customers match your search." : "No customers yet. Add your first customer."}
                    {!debouncedSearch && (
                      <div className="mt-4">
                        <Button onClick={() => navigate('/sales/customers/new')}>+ Add customer</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                data?.rows.map((customer: any) => (
                  <tr key={customer.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900">{customer.name}</div>
                      {customer.email && <div className="text-sm text-slate-500">{customer.email}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getBadgeColor(customer.customer_type)}>
                        {customer.customer_type.replace('_', ' ')}
                      </Badge>
                      {customer.fleet_name && <div className="text-xs text-slate-500 mt-1">{customer.fleet_name}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900">{customer.phone}</div>
                      <div className="text-sm text-slate-500">{customer.city || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link to={`/sales/customers/${customer.id}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-900 text-center block w-8">
                        -
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {new Date(customer.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`/sales/customers/${customer.id}`} className="text-indigo-600 hover:text-indigo-900">
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {data && data.totalCount > pageSize && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, data.totalCount)} of {data.totalCount} customers
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
