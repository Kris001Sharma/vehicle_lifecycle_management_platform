import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getCustomerById } from '@/lib/db/customers';
import { getPreBookingsByCustomer } from '@/lib/db/preBookings';
import { getCommunications, markFollowUpDone } from '@/lib/db/communications';
import { useFinanceEnabled } from '@/lib/catalog/financeConfig';
import { PreBookingFormModal } from '../pre-bookings/PreBookingFormModal';
import { PreBookingStatusModal } from '../pre-bookings/PreBookingStatusModal';
import { CommunicationLogModal } from '../communications/CommunicationLogModal';
import { useToast } from '@/hooks/useToast';
import { 
  Phone, 
  MessageSquare, 
  Mail, 
  Building, 
  User, 
  FileText, 
  Settings2, 
  Search, 
  CheckCircle2, 
  ShoppingCart, 
  Truck, 
  Package, 
  Clock,
  Archive,
  Eye,
  AlertCircle,
  Upload
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { supabase } from '@/lib/supabase/client';

const REQUIRED_DOC_TYPES = ['registration', 'insurance', 'id_proof'];
const DOC_LABELS: Record<string, string> = {
  registration: 'Registration Paper',
  insurance: 'Insurance Cover',
  id_proof: 'Citizenship / ID Proof'
};

export function CustomerDetailPage() {
  const { customerId } = useParams();
  const { tenantId, id: userId } = useAuthStore(s => s.user!) || {};
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const financeEnabled = useFinanceEnabled();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'overview' | 'pre-bookings' | 'communications' | 'documents'>('overview');
  const [isPreBookingModalOpen, setIsPreBookingModalOpen] = useState(false);
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);
  const [statusModalBooking, setStatusModalBooking] = useState<any | null>(null);

  const { data: customer, isLoading: isLoadingCustomer, error: customerError } = useQuery({
    queryKey: ['customer', customerId, tenantId],
    queryFn: () => getCustomerById(customerId!, tenantId!),
    enabled: !!tenantId && tenantId !== 'undefined' && !!customerId && customerId !== 'undefined',
  });

  const { data: preBookings, isLoading: isLoadingPreBookings } = useQuery({
    queryKey: ['pre_bookings', customerId, tenantId],
    queryFn: () => getPreBookingsByCustomer(customerId!, tenantId!),
    enabled: !!tenantId && tenantId !== 'undefined' && !!customerId && customerId !== 'undefined',
  });

  const { data: communications, isLoading: isLoadingComms } = useQuery({
    queryKey: ['communications', customerId, tenantId],
    queryFn: () => getCommunications(customerId!, tenantId!),
    enabled: !!tenantId && tenantId !== 'undefined' && !!customerId && customerId !== 'undefined',
  });

  const { data: workflowConfig } = useQuery({
    queryKey: ['workflow_config', tenantId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('tenant_workflow_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .single();
      return data;
    },
    enabled: !!tenantId
  });

  const { data: customerDocuments, refetch: refetchDocs } = useQuery({
    queryKey: ['customer_documents', customerId, tenantId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('customer_documents')
        .select('*')
        .eq('customer_id', customerId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!tenantId && tenantId !== 'undefined' && !!customerId && customerId !== 'undefined',
  });

  const markDoneMutation = useMutation({
    mutationFn: (commId: string) => markFollowUpDone(commId, tenantId!, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', customerId, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['follow_ups_due', tenantId] });
      showToast('Marked as done', 'success');
    }
  });

  const uploadDocMutation = useMutation({
    mutationFn: async ({ type, file }: { type: string, file: File }) => {
      const reader = new FileReader();
      const p = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
      });
      reader.readAsDataURL(file);
      const base64Data = await p;

      const { data, error } = await (supabase as any).from('customer_documents').insert({
        tenant_id: tenantId,
        customer_id: customerId,
        doc_type: type,
        file_name: file.name,
        file_url: base64Data // Placeholder for actual storage URL
      }).select().single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetchDocs();
      showToast('Document uploaded successfully', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to upload document', 'error');
    }
  });

  useEffect(() => {
    if (tabParam === 'pre-bookings' || tabParam === 'communications' || tabParam === 'overview' || tabParam === 'documents') {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);

  const missingDocs = useMemo(() => {
    if (!workflowConfig?.require_documents) return [];
    const uploadedTypes = customerDocuments?.map((d: any) => d.doc_type) || [];
    return REQUIRED_DOC_TYPES.filter(type => !uploadedTypes.includes(type));
  }, [workflowConfig, customerDocuments]);

  const hasMissingDocs = missingDocs.length > 0;

  if (isLoadingCustomer) {
    return (
      <PageWrapper title={<Skeleton className="h-8 w-48" />} backLink={{ label: 'Customers', path: '/sales/customers' }}>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (customerError || !customer) {
    return (
      <PageWrapper title="Customer not found" backLink={{ label: 'Customers', path: '/sales/customers' }}>
        <div className="text-center py-12">
          <div className="text-slate-500 mb-4">The requested customer could not be found.</div>
          <Button onClick={() => navigate('/sales/customers')}>Back to list</Button>
        </div>
      </PageWrapper>
    );
  }

  const renderIcon = (type: string) => {
    switch (type) {
      case 'phone_call': return <Phone className="w-5 h-5" />;
      case 'whatsapp': return <MessageSquare className="w-5 h-5" />;
      case 'email': return <Mail className="w-5 h-5" />;
      case 'site_visit': return <Building className="w-5 h-5" />;
      case 'in_person': return <User className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'enquiry': return 'neutral';
      case 'confirmed': return 'info';
      case 'ordered': return 'primary';
      case 'in_transit': return 'warning';
      case 'delivered': return 'success';
      case 'cancelled': return 'error';
      default: return 'neutral';
    }
  };

  const milestones = [
    { status: 'enquiry', label: 'Enquiry', icon: Search },
    { status: 'confirmed', label: 'Confirmed', sub: 'Deposit Paid', icon: CheckCircle2 },
    { status: 'ordered', label: 'Ordered', icon: ShoppingCart },
    { status: 'in_transit', label: 'In Transit', icon: Truck },
    { status: 'delivered', label: 'Delivered', icon: Package }
  ];

  const getMilestoneTimestamp = (pb: any, status: string) => {
    if (status === 'enquiry') return new Date(pb.created_at).toLocaleString();
    if (!communications) return null;
    
    const statusUpper = status.toUpperCase();
    const log = [...communications].reverse().find(c => 
      c.pre_booking_id === pb.id && 
      c.notes?.includes(`Status moved to ${statusUpper}`)
    );
    
    return log ? new Date(log.logged_at).toLocaleString() : null;
  };

  const hasActivePreBooking = preBookings?.some((pb: any) => !['delivered', 'cancelled'].includes(pb.status));
  const hasActiveFollowUp = communications?.some((c: any) => c.log_type === 'followup' && !c.follow_up_done);

  return (
    <PageWrapper
      title={customer.name}
      backLink={{ label: 'Customers', path: '/sales/customers' }}
    >
      <div className="mb-8 border-b border-slate-200 min-w-0">
        <nav className="flex">
          {[
            { id: 'overview', label: 'Overview', short: 'Info' },
            { id: 'pre-bookings', label: 'Pre Bookings', short: 'Bookings', indicator: hasActivePreBooking },
            { id: 'communications', label: 'Communications', short: 'Timeline', indicator: hasActiveFollowUp },
            { id: 'documents', label: 'Vault', short: 'Docs', indicator: hasMissingDocs, indicatorVariant: 'error' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 whitespace-nowrap py-3 border-b-2 font-semibold text-[10px] sm:text-xs uppercase tracking-wider transition-colors text-center relative",
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              )}
            >
              <span className="flex items-center justify-center gap-1.5">
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.short}</span>
                {tab.indicator && (
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    tab.id === 'pre-bookings' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
                    tab.indicatorVariant === 'error' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                    "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                  )} />
                )}
              </span>
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-6 col-span-1">
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Customer details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Full name</label>
                    <div className="mt-1 font-medium">{customer.name}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Customer type</label>
                    <div className="mt-1">
                      <Badge variant="neutral" className="capitalize">{customer.customer_type.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Phone</label>
                    <div className="mt-1">
                      <a href={`tel:${customer.phone}`} className="hover:text-indigo-600 font-medium">{customer.phone}</a>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Email</label>
                    <div className="mt-1 truncate">
                      {customer.email ? <a href={`mailto:${customer.email}`} className="hover:text-indigo-600 font-medium">{customer.email}</a> : <span className="italic text-slate-400">Not provided</span>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Address</label>
                    <div className="mt-1">
                      {[customer.address, customer.city].filter(Boolean).join(', ') || <span className="italic text-slate-400">Not provided</span>}
                    </div>
                  </div>
                  {customer.customer_type === 'fleet_owner' && customer.fleet_name && (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Fleet name</label>
                      <div className="mt-1 font-medium">{customer.fleet_name}</div>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Member since</label>
                    <div className="mt-1">
                      {new Date(customer.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-100">
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/sales/customers/${customerId}/edit`)}>Edit Detail</Button>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4 text-center">
                  <div className="text-xl font-bold">{customer.vehicles?.length || 0}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider">Total vehicles</div>
                </Card>
                <Card className="p-4 text-center">
                  <div className="text-xl font-bold">{customer.vehicles?.filter((v:any) => v.status === 'active').length || 0}</div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider">Active vehicles</div>
                </Card>
              </div>
            </div>

            <div className="col-span-1 md:col-span-2">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-3">
                  <h2 className="text-lg font-semibold text-slate-900">Vehicles ({customer.vehicles?.length || 0})</h2>
                  <Link to={`/sales/vehicles/new?customerId=${customerId}`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">+ New Sale</Link>
                </div>
                
                {!customer.vehicles || customer.vehicles.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-500 mb-4">No vehicles recorded.</p>
                    <Link to="/sales/vehicles/new" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                      + Record a sale
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {customer.vehicles.map((v: any) => (
                      <div 
                        key={v.id} 
                        onClick={() => navigate(`/sales/vehicles/${v.id}`)}
                        className="p-4 border border-slate-200 rounded-xl hover:border-indigo-400 hover:shadow-md cursor-pointer transition-all bg-white"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-mono font-bold text-slate-900 text-sm">{v.vehicle_number}</span>
                          <div className="flex flex-wrap justify-end gap-1">
                            {v.handover_ritual_completed && (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[9px] px-1.5 py-0">Ritual ✓</Badge>
                            )}
                            {v.amc_package_id && v.amc_package_id !== 'standard' && (
                              <Badge className={cn(
                                "text-[9px] px-1.5 py-0 capitalize",
                                v.amc_package_id === 'gold' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                v.amc_package_id === 'platinum' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                'bg-slate-100 text-slate-700 border-slate-200'
                              )}>
                                {v.amc_package_id} AMC
                              </Badge>
                            )}
                            {v.is_archived && <Badge variant="warning">Archived</Badge>}
                            <Badge variant={v.status === 'active' ? 'success' : v.status === 'transferred' ? 'neutral' : 'error'} className="capitalize text-[9px] px-1.5 py-0">
                              {v.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="mb-3">
                          <div className="text-sm font-semibold">{v.manufacturer} {v.model_name}</div>
                          <div className="flex gap-1 mt-1">
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] uppercase font-bold">{v.subcategory || 'Standard'}</span>
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] uppercase font-bold">{v.powertrain_display_label}</span>
                          </div>
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-50">
                          <div>Sale: {new Date(v.sale_date).toLocaleDateString()}</div>
                          <div>Service: {v.last_service_date ? new Date(v.last_service_date).toLocaleDateString() : 'Never'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {activeTab === 'pre-bookings' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => setIsPreBookingModalOpen(true)}>+ Create pre-booking</Button>
            </div>
            
            {isLoadingPreBookings ? (
              <Skeleton className="h-64 w-full" />
            ) : !preBookings || preBookings.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
                <p className="text-sm text-slate-500 mb-4">No pre-bookings for this customer.</p>
                <Button variant="secondary" onClick={() => setIsPreBookingModalOpen(true)}>+ Create pre-booking</Button>
              </div>
            ) : (
              <div className="grid gap-6">
                {preBookings.map((pb: any) => {
                  const currentStatusIndex = milestones.findIndex(m => m.status === pb.status);
                  const isCancelled = pb.status === 'cancelled';

                  return (
                    <Card key={pb.id} className="overflow-hidden border-slate-200/60 shadow-sm">
                      {/* Card Header (Vehicle Details) */}
                      <div className="p-5 border-b border-slate-100 bg-slate-50/30">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-lg text-slate-900">{pb.variant?.name}</h3>
                              <Badge variant={getStatusColor(pb.status) as any} className="capitalize py-0 px-2 h-5 text-[10px] font-bold uppercase tracking-widest leading-none">
                                {pb.status.replace('_', ' ')}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500 font-medium">
                              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Booked: {new Date(pb.booking_date).toLocaleDateString()}</span>
                              {pb.expected_delivery_date && (
                                <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Expected: {new Date(pb.expected_delivery_date).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          
                          {pb.inventory_unit && (
                            <div className="px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg shrink-0">
                               <div className="text-[10px] font-black uppercase tracking-wider text-indigo-400 leading-none mb-1">Assigned Unit</div>
                               <div className="text-xs font-bold text-indigo-900 font-mono tracking-tight">{pb.inventory_unit.chassis_number}</div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                          {/* Stepper (Milestones) */}
                          <div className="lg:col-span-7">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6">Booking Journey</h4>
                            <div className="relative space-y-0">
                              {milestones.map((milestone, idx) => {
                                const timestamp = getMilestoneTimestamp(pb, milestone.status);
                                const isCompleted = idx <= currentStatusIndex && !isCancelled;
                                const isCurrent = idx === currentStatusIndex && !isCancelled;
                                const showLine = idx < milestones.length - 1;

                                return (
                                  <div key={milestone.status} className="relative flex gap-4 min-h-[64px]">
                                    {showLine && (
                                      <div className={cn(
                                        "absolute left-[15px] top-[30px] bottom-[-10px] w-[2px]",
                                        isCompleted ? "bg-indigo-500" : "bg-slate-100"
                                      )} />
                                    )}

                                    <div className={cn(
                                      "z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform duration-300",
                                      isCompleted ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "bg-slate-100 text-slate-400",
                                      isCurrent && "scale-110 ring-4 ring-indigo-50"
                                    )}>
                                      <milestone.icon className="w-4 h-4" />
                                    </div>

                                    <div className="pb-8">
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                                        <div className={cn(
                                          "text-sm font-bold tracking-tight",
                                          isCompleted ? "text-slate-900" : "text-slate-400"
                                        )}>
                                          {milestone.label}
                                          {milestone.sub && milestone.status === 'confirmed' && pb.deposit_received && (
                                            <span className="ml-1 text-emerald-600">({milestone.sub})</span>
                                          )}
                                        </div>
                                        {timestamp && (
                                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide bg-slate-50 px-1.5 py-0.5 rounded">
                                            {timestamp}
                                          </div>
                                        )}
                                      </div>
                                      {isCurrent && (
                                        <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 animate-pulse">
                                          <div className="w-2 h-2 rounded-full bg-indigo-600" />
                                          Currently here
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}

                              {isCancelled && (
                                <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                                  <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg border border-red-100 font-bold flex items-center gap-2 shadow-sm">
                                    <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                                    Booking Cancelled
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Details Sidebar in Card */}
                          <div className="lg:col-span-5 space-y-6">
                            {(pb.colour_preference || pb.special_requirements) && (
                              <div className="space-y-4">
                                {pb.colour_preference && (
                                  <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Colour Preference</span>
                                    <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                      {(() => {
                                        const opt = pb.variant?.specs?.colour_options?.find((o: any) => o.name === pb.colour_preference);
                                        return opt && (
                                          <div className="w-4 h-4 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: opt.hex }} />
                                        );
                                      })()}
                                      <span className="text-sm font-bold text-slate-700">{pb.colour_preference}</span>
                                    </div>
                                  </div>
                                )}
                                {pb.special_requirements && (
                                  <div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Instructions</span>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-600 font-medium italic">
                                      "{pb.special_requirements}"
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {financeEnabled && (
                              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-4">Finance & Deposit</h4>
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-indigo-100/50">
                                    <span className="text-xs font-bold text-slate-500">Deposit Status</span>
                                    <Badge variant={pb.deposit_received ? 'success' : 'neutral'} className="h-6 font-bold">
                                      {pb.deposit_received ? 'Paid' : 'Pending'}
                                    </Badge>
                                  </div>
                                  {pb.deposit_amount && (
                                    <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-indigo-100/50">
                                      <span className="text-xs font-bold text-slate-500">Amount</span>
                                      <span className="text-sm font-black text-indigo-900">${pb.deposit_amount.toLocaleString()}</span>
                                    </div>
                                  )}
                                  {pb.finance_type && (
                                    <div className="flex justify-between items-center px-1">
                                      <span className="text-[10px] font-bold text-indigo-300 uppercase">Method</span>
                                      <span className="text-xs font-bold text-indigo-800 capitalize">{pb.finance_type.replace('_', ' ')}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Card Footer (Actions) */}
                      <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-wrap gap-2 justify-end items-center">
                        {pb.status === 'ordered' && (
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100 font-bold uppercase tracking-widest text-[9px] h-9 px-4 sm:flex-1 md:flex-none"
                            onClick={() => navigate(`/sales/vehicles/new`, { state: { preBooking: pb } })}
                          >
                            Convert to sale →
                          </Button>
                        )}
                        {!['delivered', 'cancelled'].includes(pb.status) && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 font-bold uppercase tracking-widest text-[9px] h-9 px-4 sm:flex-1 md:flex-none" 
                            onClick={() => setStatusModalBooking({ ...pb, action: 'cancel' })}
                          >
                            Cancel
                          </Button>
                        )}
                        {!['delivered', 'cancelled'].includes(pb.status) && (
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="font-bold uppercase tracking-widest text-[9px] h-9 px-4 sm:flex-1 md:flex-none"
                            onClick={() => setStatusModalBooking({ ...pb, action: 'update' })}
                          >
                            <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                            Update Status
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'communications' && (
          <div className="max-w-3xl mx-auto py-4">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Timeline</h2>
                <p className="text-sm text-slate-500 mt-1">Interactions & updates for this customer</p>
              </div>
              <Button onClick={() => setIsCommModalOpen(true)} className="rounded-full px-5 shadow-sm">
                + Log Interaction
              </Button>
            </div>

            {isLoadingComms ? (
              <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:w-0.5 before:bg-slate-100">
                {[1, 2, 3].map(i => (
                  <div key={i} className="relative pl-12">
                    <Skeleton className="absolute left-0 w-10 h-10 rounded-full" />
                    <Skeleton className="h-32 w-full rounded-2xl" />
                  </div>
                ))}
              </div>
            ) : !communications || communications.length === 0 ? (
              <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <MessageSquare className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">No history yet</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">Start logging interactions to keep track of customer communication.</p>
                <Button variant="secondary" onClick={() => setIsCommModalOpen(true)} className="rounded-full">Log first interaction</Button>
              </div>
            ) : (
              <div className="relative space-y-12 before:absolute before:top-2 before:bottom-0 before:left-[19px] before:w-px before:bg-slate-200">
                {communications.map((comm: any) => (
                  <div key={comm.id} className="relative pl-12 group">
                    {/* Timeline Dot/Icon */}
                    <div className={cn(
                      "absolute left-0 top-1.5 w-10 h-10 rounded-full border-4 border-white shadow-sm flex items-center justify-center z-10 transition-transform group-hover:scale-110",
                      comm.log_type === 'followup' ? "bg-amber-100 text-amber-600" : "bg-indigo-50 text-indigo-600"
                    )}>
                      {renderIcon(comm.interaction_type)}
                    </div>

                    <div className="space-y-4">
                      {/* Entry Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-slate-900 capitalize tracking-tight">
                            {comm.interaction_type.replace('_', ' ')}
                          </span>
                          {comm.outcome && (
                            <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-indigo-100 text-indigo-700 rounded-lg tracking-wider">
                              {comm.outcome.replace(/_/g, ' ')}
                            </span>
                          )}
                          {comm.direction && (
                            <span className="text-[10px] font-medium py-0.5 px-2 bg-slate-100 text-slate-500 rounded-lg uppercase tracking-wider">
                              {comm.direction}
                            </span>
                          )}
                          {comm.log_type === 'followup' && (
                            <span className="text-[10px] font-bold uppercase py-0.5 px-2 bg-amber-100 text-amber-700 rounded-lg tracking-wider">
                              Follow-up
                            </span>
                          )}
                        </div>
                        <time className="text-[11px] font-medium text-slate-400">
                          {new Date(comm.logged_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </time>
                      </div>

                      <div className={cn(
                        "rounded-2xl p-5 shadow-sm transition-shadow hover:shadow-md border",
                        comm.notes?.startsWith('[System]') 
                          ? "bg-slate-50/50 border-slate-200 border-dashed" 
                          : "bg-white border-slate-100"
                      )}>
                        <div className={cn(
                          "text-sm leading-relaxed whitespace-pre-wrap",
                          comm.notes?.startsWith('[System]') ? "text-slate-500 font-medium italic" : "text-slate-600"
                        )}>
                          {comm.notes}
                        </div>

                        {/* Entry Footer / Meta */}
                        <div className="mt-5 pt-4 border-t border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                {comm.user_name?.charAt(0) || 'S'}
                              </div>
                              <span className="text-xs font-medium text-slate-500">{comm.user_name || 'System'}</span>
                            </div>
                            {comm.pre_booking && (
                              <div className="flex items-center gap-1.5 text-indigo-600">
                                <FileText className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold">{comm.pre_booking.variant?.name}</span>
                              </div>
                            )}
                          </div>

                          {comm.log_type === 'followup' && (
                            <div className="flex items-center gap-3">
                              {comm.follow_up_done ? (
                                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100">
                                  <span>Done</span>
                                  <span className="w-1 h-1 rounded-full bg-emerald-300" />
                                  <span className="opacity-70">{new Date(comm.follow_up_date).toLocaleDateString()}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const today = new Date();
                                    today.setHours(0,0,0,0);
                                    const fDate = new Date(comm.follow_up_date);
                                    const isOverdue = fDate < today;
                                    const isToday = fDate.getTime() === today.getTime();
                                    
                                    return (
                                      <div className={cn(
                                        "px-3 py-1 rounded-full text-[11px] font-bold tracking-tight border",
                                        isOverdue ? "bg-red-50 text-red-700 border-red-100" : 
                                        isToday ? "bg-amber-50 text-amber-700 border-amber-100" : 
                                        "bg-slate-50 text-slate-600 border-slate-100"
                                      )}>
                                        {isOverdue ? 'Overdue: ' : isToday ? 'Due today: ' : 'Follow up: '}
                                        {fDate.toLocaleDateString()}
                                      </div>
                                    );
                                  })()}
                                  <Button 
                                    variant="secondary" 
                                    size="sm" 
                                    className="h-8 rounded-full text-xs px-4"
                                    onClick={() => markDoneMutation.mutate(comm.id)}
                                    disabled={markDoneMutation.isPending}
                                  >
                                    Complete Task
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Customer Vault</h2>
                <p className="text-sm text-slate-500 mt-1">Archived documents and verification records</p>
              </div>
            </div>

            {hasMissingDocs && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-red-100 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-red-900">Mandatory Documents Pending</h3>
                    <p className="text-xs text-red-700 mt-1 mb-4 leading-relaxed">
                      This customer has {missingDocs.length} required document{missingDocs.length > 1 ? 's' : ''} missing in their profile. Please upload them to maintain compliance.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                       {missingDocs.map(type => (
                         <div key={type} className="bg-white p-3 rounded-xl border border-red-200 flex items-center justify-between group">
                            <span className="text-xs font-bold text-slate-700">{DOC_LABELS[type]}</span>
                            <label className="cursor-pointer p-1.5 hover:bg-slate-50 rounded-lg text-indigo-600 transition-colors">
                               <Upload className="w-4 h-4" />
                               <input 
                                 type="file" 
                                 className="hidden" 
                                 onChange={(e) => {
                                   const file = e.target.files?.[0];
                                   if (file) uploadDocMutation.mutate({ type: type as string, file });
                                 }}
                               />
                            </label>
                         </div>
                       ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!customerDocuments || customerDocuments.length === 0 ? (
              <div className="text-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <Archive className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">No documents found</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">Documents uploaded during the handover ritual will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {customerDocuments.map((doc: any) => (
                  <Card key={doc.id} className="p-4 group hover:border-indigo-300 hover:shadow-md transition-all">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-slate-400 capitalize tracking-widest leading-none mb-1">{doc.doc_type.replace('_',' ')}</p>
                        <p className="text-sm font-bold text-slate-900 truncate">{doc.file_name || 'Verification Doc'}</p>
                        <p className="text-[10px] text-slate-500 mt-1 uppercase font-medium">{new Date(doc.created_at).toLocaleDateString()}</p>
                      </div>
                      <a 
                        href={doc.file_url} 
                        download={doc.file_name}
                        target="_blank" 
                        rel="noreferrer"
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-5 h-5" />
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <PreBookingFormModal
        isOpen={isPreBookingModalOpen}
        onClose={() => setIsPreBookingModalOpen(false)}
        customerId={customerId}
        customerName={customer.name}
        tenantId={tenantId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['pre_bookings', customerId, tenantId] });
        }}
      />

      {statusModalBooking && (
        <PreBookingStatusModal
          isOpen={!!statusModalBooking}
          onClose={() => setStatusModalBooking(null)}
          booking={statusModalBooking}
          tenantId={tenantId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['pre_bookings', customerId, tenantId] });
          }}
        />
      )}

      {isCommModalOpen && (
        <CommunicationLogModal
          isOpen={isCommModalOpen}
          onClose={() => setIsCommModalOpen(false)}
          customerId={customerId}
          tenantId={tenantId}
          preBookings={preBookings || []}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['communications', customerId, tenantId] });
          }}
        />
      )}
    </PageWrapper>
  );
}
