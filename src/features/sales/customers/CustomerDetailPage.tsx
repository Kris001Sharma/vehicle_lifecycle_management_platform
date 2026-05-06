import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getCustomerById } from '@/lib/db/customers';
import { Card } from '@/components/ui/Card';

export function CustomerDetailPage() {
  const { customerId } = useParams();
  const { tenantId } = useAuthStore(s => s.user!) || {};
  const navigate = useNavigate();

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customer', customerId, tenantId],
    queryFn: () => getCustomerById(customerId!, tenantId!),
    enabled: !!tenantId && !!customerId,
  });

  if (isLoading) {
    return (
      <PageWrapper title={<Skeleton className="h-8 w-48" />} backLink={{ label: '← Customers', path: '/sales/customers' }}>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (error || !customer) {
    if (error) console.error("Customer fetch error:", error);
    return (
      <PageWrapper title={error ? "Error loading customer" : "Customer not found"} backLink={{ label: '← Customers', path: '/sales/customers' }}>
        <div className="text-center py-12">
          <div className="text-slate-500 mb-4">{error ? (error as any).message : "The requested customer could not be found."}</div>
          <Button onClick={() => navigate('/sales/customers')}>Back to list</Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title={customer.name}
      backLink={{ label: '← Customers', path: '/sales/customers' }}
      actions={
        <Button variant="secondary" onClick={() => navigate(`/sales/customers/${customerId}/edit`)}>
          Edit customer
        </Button>
      }
    >
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
            <h2 className="text-lg font-semibold text-slate-900">Customer Information</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Contact Person</label>
              <div className="mt-1 text-sm font-semibold text-slate-900">{customer.name}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Customer Type</label>
              <div className="mt-1">
                <Badge variant="neutral" className="capitalize">
                  {customer.customer_type.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Phone</label>
              <div className="mt-1 text-sm text-slate-900">
                <a href={`tel:${customer.phone}`} className="hover:text-indigo-600 hover:underline">{customer.phone}</a>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Email</label>
              <div className="mt-1 text-sm text-slate-900">{customer.email || '-'}</div>
            </div>
            {customer.customer_type === 'fleet_owner' && (
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Fleet Name</label>
                <div className="mt-1 text-sm font-medium text-slate-900">{customer.fleet_name || '-'}</div>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Location</label>
              <div className="mt-1 text-sm text-slate-900">
                {[customer.address, customer.city].filter(Boolean).join(', ') || '-'}
              </div>
            </div>
          </div>
          <div className="flex justify-start">
            <Button variant="secondary" size="sm" onClick={() => navigate(`/sales/customers/${customerId}/edit`)}>
              Edit
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-3">
            <h2 className="text-lg font-semibold text-slate-900">Vehicles ({customer.vehicles?.length || 0})</h2>
            <Link to="/sales/vehicles/new" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
              + Record a sale
            </Link>
          </div>
          
          {!customer.vehicles || customer.vehicles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-slate-500 mb-4">No vehicles recorded for this customer.</p>
              <Button variant="secondary" size="sm" onClick={() => navigate('/sales/vehicles/new')}>
                + Record a sale
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customer.vehicles.map((v: any) => (
                <div 
                  key={v.id} 
                  onClick={() => navigate(`/sales/vehicles/${v.id}`)}
                  className="p-5 border border-slate-200 rounded-xl hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all bg-white group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-mono font-bold text-slate-900 text-base">{v.vehicle_number}</span>
                    <div className="flex items-center gap-2">
                      {v.is_archived && <Badge variant="warning">Archived</Badge>}
                      <Badge 
                        variant={v.status === 'active' ? 'success' : v.status === 'transferred' ? 'neutral' : v.status === 'retired' ? 'error' : 'neutral'}
                        className="font-medium"
                      >
                        {v.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-5">
                    <div className="flex items-center gap-2">
                       <span className="text-sm font-semibold text-slate-800">{v.manufacturer} {v.model_name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">{v.subcategory || 'Standard'}</span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">{v.powertrain_display_label}</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-[11px] text-slate-500 pt-3 border-t border-slate-50">
                    <div className="flex flex-col">
                      <span className="uppercase tracking-tighter font-medium opacity-70">Sale Date</span>
                      <span className="font-semibold text-slate-700">{new Date(v.sale_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="uppercase tracking-tighter font-medium opacity-70">Last Service</span>
                      <span className="font-semibold text-slate-700">{v.last_service_date ? new Date(v.last_service_date).toLocaleDateString() : 'Never'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageWrapper>
  );
}
