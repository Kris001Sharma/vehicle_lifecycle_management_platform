import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getVehicleWithFullDetails } from '@/lib/db/vehicles';
import { SpecDisplay } from '@/components/catalog/SpecDisplay';
import { TransferOwnershipModal } from './TransferOwnershipModal';

export function VehicleDetailPage() {
  const { vehicleId } = useParams();
  const { tenantId } = useAuthStore(s => s.user!) || {};

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const { data: vehicle, isLoading, refetch } = useQuery({
    queryKey: ['vehicle', vehicleId, tenantId],
    queryFn: () => getVehicleWithFullDetails(vehicleId!, tenantId!),
    enabled: !!tenantId && !!vehicleId,
  });

  if (isLoading) {
    return (
      <PageWrapper title={<Skeleton className="h-8 w-48" />} backLink={{ label: '← Vehicles', path: '/sales/vehicles' }}>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (!vehicle) {
    return (
      <PageWrapper title="Vehicle not found" backLink={{ label: '← Vehicles', path: '/sales/vehicles' }}>
        <div className="text-center py-12 text-slate-500">The requested vehicle could not be found.</div>
      </PageWrapper>
    );
  }

  const standardFeatures = vehicle.features?.filter((f: any) => f.type === 'standard') || [];
  const optionalFeatures = vehicle.features?.filter((f: any) => f.type === 'optional') || [];

  return (
    <PageWrapper
      title={vehicle.vehicle_number}
      backLink={{ label: '← Vehicles', path: '/sales/vehicles' }}
    >
      {vehicle.variant?.status === 'discontinued' && (
        <div className="mb-6 p-4 bg-amber-50 rounded-lg flex items-start gap-3 border border-amber-200">
          <div className="bg-amber-100 p-1.5 rounded-full mt-0.5">
            <svg className="w-4 h-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-800">Variant Discontinued</h3>
            <p className="text-sm text-amber-700 mt-1">
              This vehicle's variant ({vehicle.variant.name}) has been discontinued. Existing records are unaffected.
            </p>
          </div>
        </div>
      )}

      {vehicle.is_archived && (
        <div className="mb-6 p-4 bg-amber-50 rounded-lg flex items-start gap-3 border border-amber-200">
          <div className="bg-amber-100 p-1.5 rounded-full mt-0.5">
            <svg className="w-4 h-4 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-800">Vehicle Archived</h3>
            <p className="text-sm text-amber-700 mt-1">
              This vehicle's service history has been archived. Full history is available in the service portal.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
        <div className="space-y-6">
          <Card className="overflow-hidden border-none shadow-xl bg-white">
            <div className="aspect-[16/9] w-full bg-slate-900 relative group overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=1200" 
                alt={vehicle.model?.name} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-600/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                    {vehicle.variant?.powertrain?.display_label}
                  </div>
                  <div className="bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-widest border border-white/20">
                    {vehicle.variant?.model?.subcategory || 'Standard'}
                  </div>
                </div>
                <h2 className="text-3xl font-black text-white mt-3 tracking-tight">
                  <span className="text-indigo-400">{vehicle.variant?.model?.manufacturer}</span> {vehicle.variant?.model?.name}
                </h2>
                <p className="text-slate-300 text-sm font-medium mt-1 opacity-80">{vehicle.variant?.name}</p>
              </div>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-mono font-bold text-slate-900">{vehicle.vehicle_number}</h2>
                  <div className="text-sm text-slate-500 mt-1">Sold on {new Date(vehicle.sale_date).toLocaleDateString()}</div>
                </div>
                <Badge variant={vehicle.status === 'active' ? 'success' : vehicle.status === 'transferred' ? 'neutral' : 'error'}>
                  {vehicle.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Registration Plate</label>
                  <div className="mt-1 text-sm text-slate-900 font-mono">{vehicle.registration_plate || 'Not set'}</div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Chassis Number</label>
                  <div className="mt-1 text-sm text-slate-900 font-mono">{vehicle.chassis_number || 'Not set'}</div>
                </div>
                {vehicle.sale_notes && (
                  <div className="col-span-2 mt-2">
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Sale Notes</label>
                    <div className="mt-1 text-sm text-slate-700 bg-slate-50 p-3 rounded-md line-clamp-3">{vehicle.sale_notes}</div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <Button variant="secondary" onClick={() => setIsTransferModalOpen(true)}>Transfer ownership</Button>
                <Button variant="secondary">Edit vehicle details</Button>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-semibold text-slate-900">Specifications</h2>
              <p className="text-sm text-slate-500 mt-1">Technical details and performance metrics.</p>
            </div>

            {(!vehicle.variant?.specs || Object.keys(vehicle.variant.specs).length === 0) ? (
              <div className="text-sm text-slate-500 py-4 text-center">Specifications not recorded for this variant.</div>
            ) : (
              <SpecDisplay 
                categorySlug={vehicle.model?.category?.slug || ''}
                subcategorySlug={vehicle.model?.subcategory || null}
                powertrainSlug={vehicle.variant?.powertrain?.slug || ''}
                specs={vehicle.variant.specs}
                compact={false}
              />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex justify-between items-center">
              Customer Details
            </h2>
            <div className="space-y-4 mb-6">
              <div>
                <Link to={`/sales/customers/${vehicle.customer_id}`} className="text-lg font-medium text-indigo-600 hover:text-indigo-700 hover:underline">
                  {vehicle.customer?.name}
                </Link>
                <div className="mt-1">
                  <Badge variant="neutral" className="capitalize text-xs px-2 py-0.5">
                    {vehicle.customer?.customer_type?.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Phone</label>
                  <a href={`tel:${vehicle.customer?.phone}`} className="mt-1 text-sm text-slate-900 hover:underline">{vehicle.customer?.phone}</a>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Email</label>
                  <div className="mt-1 text-sm text-slate-900">{vehicle.customer?.email || '-'}</div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">City</label>
                  <div className="mt-1 text-sm text-slate-900">{vehicle.customer?.city || '-'}</div>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setIsTransferModalOpen(true)}>Transfer ownership</Button>
            </div>
          </Card>

          {vehicle.features && vehicle.features.length > 0 && (
            <Card className="p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                Features & Add-ons
              </h2>
              
              <div className="space-y-6">
                {optionalFeatures.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Optional Add-ons</h3>
                    <div className="flex flex-wrap gap-2">
                      {optionalFeatures.map((f: any) => (
                        <span key={f.feature.id} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {f.feature.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {standardFeatures.length > 0 && (
                  <div>
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Standard Features</h3>
                    <div className="flex flex-wrap gap-2">
                      {standardFeatures.map((f: any) => (
                        <span key={f.feature.id} className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                          {f.feature.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-100">
              Service Summary
            </h2>
            <div className="grid grid-cols-1 gap-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Last Service</label>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {vehicle.last_service_date ? new Date(vehicle.last_service_date).toLocaleDateString() : 'Never serviced'}
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <Link to={`/service/vehicle/${vehicleId}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center">
                View full service history <span className="ml-1">→</span>
              </Link>
              <p className="text-xs text-slate-500 mt-2">Service history is managed in the Service portal.</p>
            </div>
          </Card>
        </div>
      </div>

      <TransferOwnershipModal 
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        vehicleId={vehicleId!}
        vehicleNumber={vehicle.vehicle_number}
        currentCustomerId={vehicle.customer_id}
        tenantId={tenantId!}
        onSuccess={() => refetch()}
      />
    </PageWrapper>
  );
}
