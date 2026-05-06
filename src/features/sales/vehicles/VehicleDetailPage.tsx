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

  const { data: vehicle, isLoading, error, refetch } = useQuery({
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

  if (error || !vehicle) {
    if (error) console.error("Vehicle fetch error:", error);
    return (
      <PageWrapper title={error ? "Error loading vehicle" : "Vehicle not found"} backLink={{ label: '← Vehicles', path: '/sales/vehicles' }}>
        <div className="text-center py-12">
          <div className="text-slate-500 mb-4">{error ? (error as any).message : "The requested vehicle could not be found."}</div>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </div>
      </PageWrapper>
    );
  }

  const groupedFeatures = vehicle.features?.reduce((acc: any, f: any) => {
    const cat = f.feature?.category || 'Other';
    if (!acc[cat]) acc[cat] = { standard: [], optional: [] };
    if (f.is_standard) acc[cat].standard.push(f.feature);
    else acc[cat].optional.push(f.feature);
    return acc;
  }, {} as Record<string, { standard: any[], optional: any[] }>);

  const hasAnyFeatures = vehicle.features && vehicle.features.length > 0;

  return (
    <PageWrapper
      title={vehicle.vehicle_number}
      backLink={{ label: '← Vehicles', path: '/sales/vehicles' }}
    >
      {vehicle.variant?.status === 'discontinued' && (
        <div className="mb-6 p-4 bg-amber-50 rounded-xl flex items-start gap-3 border border-amber-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-amber-100 p-2 rounded-lg">
            <svg className="w-5 h-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-900">Variant Discontinued</h3>
            <p className="text-sm text-amber-700 mt-0.5">
              This vehicle's variant (<span className="font-semibold">{vehicle.variant.name}</span>) has been discontinued. Existing records are unaffected.
            </p>
          </div>
        </div>
      )}

      {vehicle.is_archived && (
        <div className="mb-6 p-4 bg-amber-50 rounded-xl flex items-start gap-3 border border-amber-200 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="bg-amber-100 p-2 rounded-lg">
            <svg className="w-5 h-5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-amber-900">Vehicle Archived</h3>
            <p className="text-sm text-amber-700 mt-0.5">
              This vehicle's service history has been archived. Full history is available in the service portal.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
        <div className="space-y-8">
          <Card className="overflow-hidden border-none shadow-xl bg-white ring-1 ring-slate-100">
            <div className="aspect-[16/9] w-full bg-slate-900 relative group overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=1200" 
                alt={vehicle.model?.name} 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-80"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              <div className="absolute bottom-8 left-8 right-8">
                <div className="flex items-center gap-2 mb-4">
                  <Badge className="bg-indigo-500 hover:bg-indigo-500 text-white border-none px-2.5 py-1 text-[10px] font-black uppercase tracking-widest leading-none">
                    {vehicle.variant?.powertrain?.display_label}
                  </Badge>
                  <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest leading-none">
                    {vehicle.variant?.model?.subcategory || 'Standard'}
                  </Badge>
                </div>
                <h2 className="text-4xl font-black text-white tracking-tight">
                  <span className="text-indigo-400 opacity-90">{vehicle.variant?.model?.manufacturer}</span> {vehicle.variant?.model?.name}
                </h2>
                <p className="text-slate-400 text-sm font-bold mt-2 uppercase tracking-widest">{vehicle.variant?.name}</p>
              </div>
            </div>
            <div className="p-8">
              <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-100">
                <div>
                  <h2 className="text-3xl font-mono font-black text-slate-900 tracking-tighter">{vehicle.vehicle_number}</h2>
                  <div className="text-sm font-medium text-slate-500 mt-1 uppercase tracking-wide">Identity & Core Details</div>
                </div>
                <Badge 
                  variant={vehicle.status === 'active' ? 'success' : vehicle.status === 'transferred' ? 'neutral' : 'error'}
                  className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider"
                >
                  {vehicle.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Registration Plate</label>
                  <div className="text-lg font-mono font-bold text-slate-900">{vehicle.registration_plate || '-'}</div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Chassis Number</label>
                  <div className="text-lg font-mono font-bold text-slate-900">{vehicle.chassis_number || '-'}</div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Recorded Sale</label>
                  <div className="text-sm font-bold text-slate-900">{new Date(vehicle.sale_date).toLocaleDateString(undefined, { dateStyle: 'long' })}</div>
                </div>
                {vehicle.sale_notes && (
                  <div className="col-span-2 space-y-1 mt-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal Notes</label>
                    <div className="text-sm font-medium text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 italic">
                      "{vehicle.sale_notes}"
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3 pt-6 border-t border-slate-100">
                <Button variant="secondary" className="h-11 px-6 font-bold text-sm shadow-sm" onClick={() => setIsTransferModalOpen(true)}>Transfer ownership</Button>
                <Button variant="secondary" className="h-11 px-6 font-bold text-sm shadow-sm">Edit vehicle details</Button>
              </div>
            </div>
          </Card>

          <Card className="p-8 ring-1 ring-slate-100 border-none shadow-lg">
            <div className="mb-8 border-b border-slate-100 pb-6">
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Variant & Specifications</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{vehicle.variant?.model?.manufacturer}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                <span className="text-sm font-bold text-slate-900">{vehicle.variant?.model?.name}</span>
              </div>
            </div>

            {(!vehicle.variant?.specs || Object.keys(vehicle.variant.specs).length === 0) ? (
              <div className="text-sm font-medium text-slate-400 py-8 text-center italic font-serif">
                Specifications not recorded for this variant.
              </div>
            ) : (
              <SpecDisplay 
                categorySlug={vehicle.variant?.model?.category?.slug || ''}
                subcategorySlug={vehicle.variant?.model?.subcategory || null}
                powertrainSlug={vehicle.variant?.powertrain?.slug || ''}
                specs={vehicle.variant.specs}
                compact={false}
              />
            )}
          </Card>
        </div>

        <div className="space-y-8">
          <Card className="p-8 ring-1 ring-slate-100 border-none shadow-lg">
            <h2 className="text-lg font-black text-slate-900 mb-6 pb-4 border-b border-slate-100 flex justify-between items-center tracking-tight">
              Current Owner
            </h2>
            <div className="space-y-6 mb-8">
              <div className="flex flex-col gap-2">
                <Link to={`/sales/customers/${vehicle.customer_id}`} className="text-2xl font-black text-indigo-600 hover:text-indigo-700 transition-colors tracking-tight">
                  {vehicle.customer?.name}
                </Link>
                <div>
                  <Badge variant="neutral" className="bg-slate-900 text-white border-none px-3 py-1 text-[10px] font-black uppercase tracking-widest leading-none">
                    {vehicle.customer?.customer_type?.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</label>
                  <a href={`tel:${vehicle.customer?.phone}`} className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                    {vehicle.customer?.phone}
                  </a>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                  <div className="text-sm font-bold text-slate-900 truncate">{vehicle.customer?.email || '-'}</div>
                </div>
                <div className="space-y-1 col-span-full">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">City</label>
                  <div className="text-sm font-bold text-slate-900">{vehicle.customer?.city || '-'}</div>
                </div>
              </div>
            </div>
            <div className="pt-6 border-t border-slate-100">
              <Button 
                variant="secondary" 
                className="w-full h-11 font-bold text-slate-700 hover:bg-slate-100" 
                onClick={() => setIsTransferModalOpen(true)}
              >
                Transfer ownership
              </Button>
            </div>
          </Card>

          {hasAnyFeatures && (
            <Card className="p-8 ring-1 ring-slate-100 border-none shadow-lg">
              <h2 className="text-lg font-black text-slate-900 mb-6 pb-4 border-b border-slate-100 tracking-tight">
                Features & Configuration
              </h2>
              
              <div className="space-y-8">
                {Object.entries(groupedFeatures).map(([category, types]: [string, any]) => (
                  <div key={category} className="space-y-4">
                    <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">{category}</h3>
                    <div className="flex flex-wrap gap-2">
                       {types.optional.map((feat: any) => (
                        <span key={feat.id} className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
                          {feat.name}
                        </span>
                      ))}
                      {types.standard.map((feat: any) => (
                        <span key={feat.id} className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          {feat.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 pt-6 border-t border-slate-50 flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-slate-200" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Standard</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-400" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Optional</span>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-8 ring-1 ring-slate-100 border-none shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
              <svg className="w-24 h-24 text-slate-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
              </svg>
            </div>
            <h2 className="text-lg font-black text-slate-900 mb-6 pb-4 border-b border-slate-100 tracking-tight">
              Service Summary
            </h2>

            <div className="grid grid-cols-1 gap-6 mb-8">
              <div className="bg-slate-50 p-4 rounded-xl">
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Services</label>
                 <div className="text-2xl font-black text-slate-900">{vehicle.total_service_count || 0}</div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Service</label>
                  <div className="text-sm font-bold text-slate-900">
                    {vehicle.last_service_date ? new Date(vehicle.last_service_date).toLocaleDateString() : 'Never serviced'}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Next Service Due</label>
                  <div className="mt-1 flex items-center gap-2">
                    {vehicle.next_service_date ? (
                      <>
                        <span className={`text-sm font-bold ${new Date(vehicle.next_service_date) < new Date() ? 'text-red-600' : 'text-slate-900'}`}>
                          {new Date(vehicle.next_service_date).toLocaleDateString()}
                        </span>
                        {vehicle.next_service_km && <span className="text-slate-500 text-xs font-medium">at {vehicle.next_service_km.toLocaleString()} km</span>}
                      </>
                    ) : (
                      <span className="text-sm font-medium text-slate-400">Not scheduled</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <Link 
                to={`/service/vehicle/${vehicleId}`} 
                className="inline-flex items-center text-sm font-black text-indigo-600 hover:text-indigo-700 group/link"
              >
                View full service history 
                <span className="ml-2 transition-transform group-hover/link:translate-x-1">→</span>
              </Link>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em] mt-3">Service records managed in Service Portal</p>
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
