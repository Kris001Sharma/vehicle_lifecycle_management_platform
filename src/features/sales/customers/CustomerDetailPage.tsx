import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
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

  const { data: customer, isLoading } = useQuery({
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

  if (!customer) {
    return (
      <PageWrapper title="Customer not found" backLink={{ label: '← Customers', path: '/sales/customers' }}>
        <div className="text-center py-12 text-slate-500">The requested customer could not be found.</div>
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
          <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-3">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-6">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Phone</label>
              <div className="mt-1 text-sm text-slate-900">{customer.phone}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Email</label>
              <div className="mt-1 text-sm text-slate-900">{customer.email || '-'}</div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Customer Type</label>
              <div className="mt-1">
                <Badge variant="neutral" className="capitalize">
                  {customer.customer_type.replace('_', ' ')}
                </Badge>
              </div>
            </div>
            {customer.customer_type === 'fleet_owner' && (
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Fleet Name</label>
                <div className="mt-1 text-sm font-medium text-slate-900">{customer.fleet_name}</div>
              </div>
            )}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Address</label>
              <div className="mt-1 text-sm text-slate-900">
                {customer.address ? `${customer.address}${customer.city ? `, ${customer.city}` : ''}` : (customer.city || '-')}
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
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
            <h2 className="text-lg font-semibold text-slate-900">Vehicles ({customer.vehicles?.length || 0})</h2>
            <Button size="sm" variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50" onClick={() => navigate('/sales/vehicles/new')}>
              + Record a sale
            </Button>
          </div>
          
          {!customer.vehicles || customer.vehicles.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500">
              No vehicles recorded for this customer.
            </div>
          ) : (
            <div className="space-y-3">
              {customer.vehicles.map((v: any) => (
                <div 
                  key={v.id} 
                  onClick={() => navigate(`/sales/vehicles/${v.id}`)}
                  className="block p-4 border border-slate-200 rounded-lg hover:border-indigo-300 hover:shadow-sm cursor-pointer transition-all bg-white"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono font-semibold text-slate-900">{v.vehicle_number}</span>
                    <div className="flex gap-2">
                      {v.is_archived && <Badge variant="warning">Archived</Badge>}
                      <Badge 
                        variant={v.status === 'active' ? 'success' : v.status === 'transferred' ? 'neutral' : 'error'}
                      >
                        {v.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 mb-3 text-sm text-slate-600">
                    <span className="font-medium">{v.manufacturer} {v.model_name}</span>
                    <span className="text-slate-300">•</span>
                    <Badge variant="neutral" className="bg-slate-100 text-xs font-normal border-none">{v.subcategory || v.category_name}</Badge>
                    <Badge variant="neutral" className="bg-slate-100 text-xs font-normal border-none">{v.powertrain_display_label}</Badge>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-slate-500 pt-3 border-t border-slate-100">
                    <div>Sold: {new Date(v.sale_date).toLocaleDateString()}</div>
                    <div>Last service: {v.last_service_date ? new Date(v.last_service_date).toLocaleDateString() : 'Never'}</div>
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
