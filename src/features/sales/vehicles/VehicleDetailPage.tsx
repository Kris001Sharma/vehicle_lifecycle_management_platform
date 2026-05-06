import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import { 
  Car, 
  Clock, 
  History, 
  Edit3, 
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getVehicleWithFullDetails } from '@/lib/db/vehicles';
import { getPreBookings } from '@/lib/db/preBookings';
import { SpecDisplay } from '@/components/catalog/SpecDisplay';
import { TransferOwnershipModal } from './TransferOwnershipModal';
import { cn } from '@/utils/cn';

export function VehicleDetailPage() {
  const { vehicleId } = useParams();
  const { tenantId } = useAuthStore(s => s.user!) || {};

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const { data: vehicle, isLoading, error, refetch } = useQuery({
    queryKey: ['vehicle', vehicleId, tenantId],
    queryFn: () => getVehicleWithFullDetails(vehicleId!, tenantId!),
    enabled: !!tenantId && !!vehicleId,
  });

  const { data: preBookings } = useQuery({
    queryKey: ['pre_bookings', { vehicleId, tenantId }],
    queryFn: () => getPreBookings(tenantId!, { vehicleId: vehicleId! }),
    enabled: !!tenantId && !!vehicleId,
  });

  if (isLoading) {
    return (
      <PageWrapper title={<Skeleton className="h-8 w-48" />} backLink={{ label: '← Vehicles', path: '/sales/vehicles' }}>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (error || !vehicle) {
    return (
      <PageWrapper title="Vehicle not found" backLink={{ label: '← Vehicles', path: '/sales/vehicles' }}>
        <div className="text-center py-12">
          <div className="text-slate-500 mb-4">The requested vehicle could not be found.</div>
          <Button variant="secondary" onClick={() => window.history.back()}>← Back to vehicles</Button>
        </div>
      </PageWrapper>
    );
  }

  const preBooking: any = preBookings && preBookings.length > 0 ? preBookings[0] : null;

  return (
    <PageWrapper
      title={<span className="font-mono text-slate-500 text-sm">Vehicles / <span className="text-slate-900">{vehicle.vehicle_number}</span></span>}
      backLink={{ label: 'Vehicles', path: '/sales/vehicles' }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-4">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-8">
          {/* 1. HERO HEADER CARD */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="relative h-72 rounded-2xl overflow-hidden shadow-xl border border-slate-200">
              <img 
                src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=1200" 
                alt="Vehicle"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
              
              <div className="absolute top-6 left-6 flex gap-2">
                {vehicle.variant?.powertrain?.display_label && (
                  <Badge variant="info" className="bg-blue-600/80 text-white border-none py-1.5 px-4 rounded-full backdrop-blur-md">
                    {vehicle.variant.powertrain.display_label}
                  </Badge>
                )}
                {vehicle.variant?.model?.subcategory && (
                  <Badge variant="neutral" className="bg-slate-700/80 text-white border-none py-1.5 px-4 rounded-full backdrop-blur-md">
                    {vehicle.variant.model.subcategory}
                  </Badge>
                )}
              </div>

              <div className="absolute bottom-8 left-10">
                <div className="flex items-center gap-2 text-white/70 font-bold text-xs mb-2 uppercase tracking-[0.2em]">
                  {vehicle.variant?.model?.manufacturer} <div className="w-1 h-1 bg-white/40 rounded-full" /> {vehicle.variant?.model?.use_type?.replace('_', ' ')}
                </div>
                <h1 className="text-5xl font-black text-white leading-tight">
                  {vehicle.variant?.model?.manufacturer} <span className="text-white/50 font-light">{vehicle.variant?.name}</span>
                </h1>
                <div className="mt-4 flex items-center gap-3">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">VEHICLE REF</span>
                  <span className="text-base font-mono text-white font-bold tracking-widest bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm">
                    {vehicle.vehicle_number}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* 2. IDENTITY & CORE DETAILS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="relative overflow-visible">
              <div className="absolute -top-3 right-10">
                <Badge 
                  variant={vehicle.status === 'active' ? 'success' : vehicle.status === 'transferred' ? 'neutral' : 'error'}
                  className="px-6 py-2 shadow-lg text-xs font-black tracking-widest ring-4 ring-white rounded-full"
                >
                  {vehicle.status}
                </Badge>
              </div>

              <div className="p-10">
                <div className="mb-10">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Identity & Core Details</h3>
                  <div className="text-5xl font-black text-slate-900 tracking-tight">{vehicle.vehicle_number}</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-16 border-t border-slate-100 pt-10">
                  <InfoItem label="REGISTRATION PLATE" value={vehicle.registration_plate} placeholder="-" />
                  <InfoItem label="CHASSIS NUMBER" value={vehicle.chassis_number} placeholder="-" />
                  <InfoItem label="RECORDED SALE" value={vehicle.sale_date ? new Date(vehicle.sale_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null} />
                  
                  {vehicle.sale_notes && (
                    <div className="col-span-full bg-slate-50/80 p-8 rounded-2xl border border-slate-100 relative">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Internal Notes</div>
                      <div className="text-xl text-slate-700 leading-relaxed font-medium capitalize prose prose-slate">
                        "{vehicle.sale_notes}"
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-12 flex flex-wrap gap-4 pt-8 border-t border-slate-50">
                  <Button variant="secondary" className="h-14 px-8 rounded-2xl font-bold bg-white shadow-sm border-slate-200 hover:border-indigo-200 transition-all" onClick={() => setIsTransferModalOpen(true)}>
                    <History className="w-5 h-5 mr-3 text-slate-400" />
                    Transfer ownership
                  </Button>
                  <Button variant="secondary" className="h-14 px-8 rounded-2xl font-bold bg-white shadow-sm border-slate-200 hover:border-indigo-200 transition-all">
                    <Edit3 className="w-5 h-5 mr-3 text-slate-400" />
                    Edit vehicle details
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* 3. PERFORMANCE & SPECS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card>
              <div className="p-10">
                <div className="mb-8 flex items-start justify-between">
                  <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Variant & Specifications</h2>
                    <div className="text-slate-400 font-bold text-sm mt-1 uppercase tracking-widest">{vehicle.variant?.model?.manufacturer} <span className="mx-2 opacity-50">•</span> {vehicle.variant?.name}</div>
                  </div>
                  <Car className="w-12 h-12 text-slate-100" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 border-b border-slate-100 pb-10">
                  <SpecBox label="Manufacturer" value={vehicle.variant?.model?.manufacturer} />
                  <SpecBox label="Model Year" value={new Date(vehicle.sale_date).getFullYear()} />
                  <SpecBox label="Colour Options" value={preBooking?.colour_preference || 'Not specified'} />
                </div>

                <SpecDisplay 
                  categorySlug={vehicle.variant?.model?.category?.slug || ''}
                  subcategorySlug={vehicle.variant?.model?.subcategory || null}
                  powertrainSlug={vehicle.variant?.powertrain?.slug || ''}
                  specs={vehicle.variant?.specs || {}}
                  compact={false}
                />
              </div>
            </Card>
          </motion.div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-4 space-y-8">
          {/* 1. CURRENT OWNER */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="border-indigo-100/50 shadow-sm">
              <div className="p-10">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-8">Current Owner</h2>
                
                <div className="mb-10">
                  <Link to={`/sales/customers/${vehicle.customer_id}`} className="text-3xl font-black text-indigo-600 hover:text-indigo-800 tracking-tight leading-tight block mb-3">
                    {vehicle.customer?.name}
                  </Link>
                  <Badge variant="neutral" className="bg-slate-900 text-white font-black px-4 py-1 rounded flex-none inline-block">
                    {vehicle.customer?.customer_type}
                  </Badge>
                </div>

                <div className="bg-slate-50/80 rounded-3xl p-8 border border-slate-100 space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">PHONE</div>
                      <div className="text-base font-bold text-slate-700 tracking-tight">{vehicle.customer?.phone}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">EMAIL</div>
                      <div className="text-base font-bold text-slate-700 truncate tracking-tight">{vehicle.customer?.email || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">CITY</div>
                      <div className="text-base font-bold text-slate-700 tracking-tight">{vehicle.customer?.city || '-'}</div>
                    </div>
                  </div>
                </div>

                <Button 
                  variant="secondary" 
                  className="w-full mt-10 h-14 rounded-2xl text-indigo-600 font-black border-slate-200 hover:bg-slate-50 shadow-sm"
                  onClick={() => setIsTransferModalOpen(true)}
                >
                  Transfer ownership
                </Button>
              </div>
            </Card>
          </motion.div>

          {/* 2. SERVICE SUMMARY */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <Card className="relative overflow-hidden group">
              <div className="absolute -right-8 -bottom-8 opacity-[0.03] group-hover:opacity-[0.08] transition-all duration-700">
                <Clock className="w-56 h-56 rotate-12" />
              </div>

              <div className="p-10 relative z-10">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-10">Service Summary</h2>

                <div className="mb-12">
                  <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">TOTAL SERVICES</div>
                  <div className="text-7xl font-black text-slate-900 tracking-tighter">
                    {vehicle.total_service_count || 0}
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="flex justify-between items-center group/item">
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">LAST SERVICE</div>
                      <div className="text-base font-bold text-slate-700 tracking-tight">
                        {vehicle.last_service_date ? new Date(vehicle.last_service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never serviced'}
                      </div>
                    </div>
                    <CheckCircle2 className={cn("w-6 h-6", vehicle.last_service_date ? "text-emerald-500" : "text-slate-200")} />
                  </div>

                  <div className="flex justify-between items-center group/item">
                    <div className="flex-1">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">NEXT SERVICE DUE</div>
                      <div className="text-base font-bold text-slate-700 tracking-tight">
                         {vehicle.next_service_date ? (
                           <span className={cn(
                             new Date(vehicle.next_service_date).getTime() < Date.now() ? "text-red-500 font-black underline underline-offset-4 decoration-2" : "text-slate-900"
                           )}>
                             {new Date(vehicle.next_service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                           </span>
                         ) : 'Not scheduled'}
                         {vehicle.next_service_km && <div className="text-slate-400 font-semibold text-xs mt-0.5 tracking-tight">at {vehicle.next_service_km.toLocaleString()} km</div>}
                      </div>
                    </div>
                    <AlertCircle className={cn("w-6 h-6", vehicle.next_service_date ? "text-indigo-400" : "text-slate-200")} />
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-50">
                  <Link 
                    to={`/service/vehicle/${vehicle.id}`} 
                    className="text-indigo-600 font-black text-sm flex items-center gap-2 hover:gap-4 transition-all group/link"
                  >
                    View full service history 
                    <ChevronRight className="w-5 h-5 transition-transform group-hover/link:translate-x-1" />
                  </Link>
                  <div className="mt-3 text-[9px] font-bold text-slate-400 uppercase tracking-[0.1em] prose prose-sm">
                    Managed in Enterprise Service Portal
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
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

// HELPER COMPONENTS
function InfoItem({ label, value, placeholder }: { label: string, value: any, placeholder?: string }) {
  return (
    <div>
      <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{label}</div>
      <div className={cn("text-xl font-bold tracking-tight", !value ? "text-slate-300 italic font-normal" : "text-slate-800")}>
        {value || placeholder || "-"}
      </div>
    </div>
  );
}

function SpecBox({ label, value }: { label: string, value: any }) {
  return (
    <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 group hover:border-indigo-100 hover:bg-indigo-50/30 transition-all duration-300">
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{label}</div>
      <div className="text-base font-black text-slate-800 tracking-tight">{value || "-"}</div>
    </div>
  );
}
