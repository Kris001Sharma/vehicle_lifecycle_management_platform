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
  AlertCircle,
  ShieldCheck,
  Zap,
  Award,
  BadgePercent
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
      <PageWrapper title={<Skeleton className="h-8 w-48" />} backLink={{ label: 'Vehicles', path: '/sales/vehicles' }}>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (error || !vehicle) {
    return (
      <PageWrapper title="Vehicle not found" backLink={{ label: 'Vehicles', path: '/sales/vehicles' }}>
        <div className="text-center py-12">
          <div className="text-slate-500 mb-4">The requested vehicle could not be found.</div>
          <Button variant="secondary" onClick={() => window.history.back()}>Back to vehicles</Button>
        </div>
      </PageWrapper>
    );
  }

  const preBooking: any = preBookings && preBookings.length > 0 ? preBookings[0] : null;

  const amcLabels: Record<string, { label: string, color: string, icon: any }> = {
    'standard': { label: 'Standard Warranty', color: 'bg-slate-100 text-slate-600', icon: ShieldCheck },
    'silver': { label: 'Silver AMC (+1yr)', color: 'bg-slate-200 text-slate-700', icon: Award },
    'gold': { label: 'Gold AMC (+2yrs)', color: 'bg-amber-100 text-amber-700', icon: Zap },
    'platinum': { label: 'Platinum AMC (+3yrs)', color: 'bg-indigo-100 text-indigo-700', icon: BadgePercent },
  };

  const amcInfo = amcLabels[vehicle.amc_package_id || 'standard'] || amcLabels.standard;
  const AmcIcon = amcInfo.icon;

  return (
    <PageWrapper
      title={<span className="font-mono text-slate-500 text-sm">Vehicles / <span className="text-slate-900">{vehicle.vehicle_number}</span></span>}
      backLink={{ label: 'Vehicles', path: '/sales/vehicles' }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 mt-4">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-6 md:space-y-8">
          {/* 1. HERO HEADER CARD */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="relative h-48 md:h-56 rounded-xl overflow-hidden shadow-sm border border-slate-200">
              <img 
                src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=1200" 
                alt="Vehicle"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
              
              <div className="absolute top-3 left-3 md:top-5 md:left-5 flex flex-wrap gap-2">
                {vehicle.variant?.powertrain?.display_label && (
                  <Badge variant="info" className="bg-blue-600/90 text-white border-none py-1 px-3 rounded-full backdrop-blur-md text-[9px] md:text-[10px] font-bold uppercase tracking-wider">
                    {vehicle.variant.powertrain.display_label}
                  </Badge>
                )}
                {vehicle.handover_ritual_completed && (
                  <Badge className="bg-emerald-600/90 text-white border-none py-1 px-3 rounded-full backdrop-blur-md text-[9px] md:text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Handover Ritual Complete
                  </Badge>
                )}
                <Badge className={cn("border-none py-1 px-3 rounded-full backdrop-blur-md text-[9px] md:text-[10px] font-bold uppercase tracking-wider flex items-center gap-1", amcInfo.color)}>
                  <AmcIcon className="w-3 h-3" /> {amcInfo.label}
                </Badge>
              </div>

              <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6">
                <div className="flex items-center gap-2 text-white/80 font-bold text-[9px] md:text-[10px] mb-1 uppercase tracking-widest">
                  {vehicle.variant?.model?.manufacturer} <div className="w-1 h-1 bg-white/40 rounded-full" /> {vehicle.variant?.model?.use_type?.replace('_', ' ')}
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight tracking-tight">
                  {vehicle.variant?.model?.manufacturer} <span className="text-white/70 font-medium">{vehicle.variant?.name}</span>
                </h1>
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
              <div className="absolute -top-3 right-6">
                <Badge 
                  variant={vehicle.status === 'active' ? 'success' : vehicle.status === 'transferred' ? 'neutral' : 'error'}
                  className="px-4 py-1.5 shadow-sm text-xs font-semibold tracking-wider ring-4 ring-white rounded"
                >
                  {vehicle.status}
                </Badge>
              </div>

              <div className="p-5 md:p-6">
                <div className="mb-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Identity & Core Details</h3>
                    <div className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">{vehicle.vehicle_number}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 border-t border-slate-100 pt-5">
                  <InfoItem label="REGISTRATION PLATE" value={vehicle.registration_plate} placeholder="-" />
                  <InfoItem label="CHASSIS NUMBER" value={vehicle.chassis_number} placeholder="-" />
                  <InfoItem label="RECORDED SALE" value={vehicle.sale_date ? new Date(vehicle.sale_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null} />
                  <InfoItem label="WARRANTY CERT#" value={vehicle.warranty_certificate_no} placeholder="Not activated" />
                  
                  {vehicle.sale_notes && (
                    <div className="col-span-full bg-slate-50/50 p-4 rounded-lg border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Internal Notes</div>
                      <div className="text-sm text-slate-600 leading-relaxed font-medium italic">
                        "{vehicle.sale_notes}"
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex flex-wrap gap-2 pt-5 border-t border-slate-50">
                  <Button variant="secondary" size="sm" className="rounded font-bold uppercase tracking-wider text-[10px] bg-white shadow-xs border-slate-200" onClick={() => setIsTransferModalOpen(true)}>
                    <History className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                    Transfer
                  </Button>
                  <Button variant="secondary" size="sm" className="rounded font-bold uppercase tracking-wider text-[10px] bg-white shadow-xs border-slate-200">
                    <Edit3 className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                    Edit Details
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
              <div className="p-6 md:p-8">
                <div className="mb-6 flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Variant & Specifications</h2>
                    <div className="text-slate-500 font-medium text-sm mt-1 uppercase tracking-wider">{vehicle.variant?.model?.manufacturer} <span className="mx-2 opacity-50">•</span> {vehicle.variant?.name}</div>
                  </div>
                  <Car className="w-8 h-8 text-slate-200" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 border-b border-slate-100 pb-8">
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
            <Card className="border-slate-200 shadow-sm">
              <div className="p-6 md:p-8">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-6">Current Owner</h2>
                
                <div className="mb-8">
                  <Link to={`/sales/customers/${vehicle.customer_id}`} className="text-2xl font-bold text-indigo-600 hover:text-indigo-800 tracking-tight leading-tight block mb-2">
                    {vehicle.customer?.name}
                  </Link>
                  <Badge variant="neutral" className="bg-slate-800 text-white font-medium px-2 py-0.5 rounded flex-none inline-block">
                    {vehicle.customer?.customer_type}
                  </Badge>
                </div>

                <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">PHONE</div>
                      <div className="text-sm font-medium text-slate-800 tracking-tight">{vehicle.customer?.phone}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">EMAIL</div>
                      <div className="text-sm font-medium text-slate-800 truncate tracking-tight">{vehicle.customer?.email || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">CITY</div>
                      <div className="text-sm font-medium text-slate-800 tracking-tight">{vehicle.customer?.city || '-'}</div>
                    </div>
                  </div>
                </div>

                <Button 
                  variant="secondary" 
                  className="w-full mt-6 rounded-lg text-indigo-600 font-medium border-slate-200 hover:bg-slate-50 shadow-sm"
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
              <div className="absolute -right-8 -bottom-8 opacity-5 group-hover:opacity-10 transition-all duration-500">
                <Clock className="w-48 h-48 rotate-12" />
              </div>

              <div className="p-6 md:p-8 relative z-10">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-8">Service Summary</h2>

                <div className="mb-8 border-b border-slate-100 pb-6">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">TOTAL SERVICES</div>
                  <div className="text-4xl font-bold text-slate-900 tracking-tight">
                    {vehicle.total_service_count || 0}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-lg">
                    <div>
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">LAST SERVICE</div>
                      <div className="text-sm font-semibold text-slate-800">
                        {vehicle.last_service_date ? new Date(vehicle.last_service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Never serviced'}
                      </div>
                    </div>
                    <CheckCircle2 className={cn("w-5 h-5", vehicle.last_service_date ? "text-emerald-500" : "text-slate-300")} />
                  </div>

                  <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-lg">
                    <div className="flex-1">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">NEXT SERVICE DUE</div>
                      <div className="text-sm font-semibold text-slate-800">
                         {vehicle.next_service_date ? (
                           <span className={cn(
                             new Date(vehicle.next_service_date).getTime() < Date.now() ? "text-red-600 font-bold" : "text-slate-900"
                           )}>
                             {new Date(vehicle.next_service_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                           </span>
                         ) : 'Not scheduled'}
                         {vehicle.next_service_km && <div className="text-slate-500 font-medium text-xs mt-0.5">at {vehicle.next_service_km.toLocaleString()} km</div>}
                      </div>
                    </div>
                    <AlertCircle className={cn("w-5 h-5", vehicle.next_service_date ? "text-amber-500" : "text-slate-300")} />
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                  <Link 
                    to={`/service/vehicle/${vehicle.id}`} 
                    className="text-indigo-600 font-medium text-sm flex items-center gap-1 hover:gap-2 transition-all group/link"
                  >
                    View full service history 
                    <ChevronRight className="w-4 h-4 transition-transform group-hover/link:translate-x-0.5" />
                  </Link>
                  <div className="mt-2 text-xs text-slate-500 uppercase tracking-wider">
                    Managed in Service Portal
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
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={cn("text-base font-medium text-slate-900", !value && "text-slate-400 italic")}>
        {value || placeholder || "-"}
      </div>
    </div>
  );
}

function SpecBox({ label, value }: { label: string, value: any }) {
  return (
    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 hover:border-indigo-100 hover:bg-slate-50 transition-colors">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-sm font-semibold text-slate-900">{value || "-"}</div>
    </div>
  );
}
