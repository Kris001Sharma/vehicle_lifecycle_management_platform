import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import { Phone, MessageSquare, Mail, Building, User, FileText } from 'lucide-react';

export function CustomerDetailPage() {
  const { customerId } = useParams();
  const { tenantId } = useAuthStore(s => s.user!) || {};
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const financeEnabled = useFinanceEnabled();

  const [activeTab, setActiveTab] = useState<'overview' | 'pre-bookings' | 'communications'>('overview');
  const [isPreBookingModalOpen, setIsPreBookingModalOpen] = useState(false);
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);
  const [statusModalBooking, setStatusModalBooking] = useState<any | null>(null);

  const { data: customer, isLoading: isLoadingCustomer, error: customerError } = useQuery({
    queryKey: ['customer', customerId, tenantId],
    queryFn: () => getCustomerById(customerId!, tenantId!),
    enabled: !!tenantId && !!customerId,
  });

  const { data: preBookings, isLoading: isLoadingPreBookings } = useQuery({
    queryKey: ['pre_bookings', customerId, tenantId],
    queryFn: () => getPreBookingsByCustomer(customerId!, tenantId!),
    enabled: !!tenantId && !!customerId && activeTab === 'pre-bookings',
  });

  const { data: communications, isLoading: isLoadingComms } = useQuery({
    queryKey: ['communications', customerId, tenantId],
    queryFn: () => getCommunications(customerId!, tenantId!),
    enabled: !!tenantId && !!customerId && activeTab === 'communications',
  });

  const markDoneMutation = useMutation({
    mutationFn: (commId: string) => markFollowUpDone(commId, tenantId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['communications', customerId, tenantId] });
      queryClient.invalidateQueries({ queryKey: ['follow_ups_due', tenantId] });
      showToast('Marked as done', 'success');
    }
  });

  if (isLoadingCustomer) {
    return (
      <PageWrapper title={<Skeleton className="h-8 w-48" />} backLink={{ label: '← Customers', path: '/sales/customers' }}>
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </PageWrapper>
    );
  }

  if (customerError || !customer) {
    return (
      <PageWrapper title="Customer not found" backLink={{ label: '← Customers', path: '/sales/customers' }}>
        <div className="text-center py-12">
          <div className="text-slate-500 mb-4">The requested customer could not be found.</div>
          <Button onClick={() => navigate('/sales/customers')}>Back to list</Button>
        </div>
      </PageWrapper>
    );
  }

  const renderIcon = (type: string) => {
    switch (type) {
      case 'phone_call': return <Phone className="w-5 h-5 text-slate-400" />;
      case 'whatsapp': return <MessageSquare className="w-5 h-5 text-slate-400" />;
      case 'email': return <Mail className="w-5 h-5 text-slate-400" />;
      case 'site_visit': return <Building className="w-5 h-5 text-slate-400" />;
      case 'in_person': return <User className="w-5 h-5 text-slate-400" />;
      default: return <FileText className="w-5 h-5 text-slate-400" />;
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
      <div className="mb-6 border-b border-slate-200">
        <nav className="-mb-px flex space-x-6">
          {(['overview', 'pre-bookings', 'communications'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1).replace('-', ' ')}
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
                      <a href={`tel:${customer.phone}`} className="hover:text-indigo-600">{customer.phone}</a>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Email</label>
                    <div className="mt-1 truncate">
                      {customer.email ? <a href={`mailto:${customer.email}`} className="hover:text-indigo-600">{customer.email}</a> : <span className="italic text-slate-400">Not provided</span>}
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
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/sales/customers/${customerId}/edit`)}>Edit</Button>
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
                          <div className="flex gap-1">
                            {v.is_archived && <Badge variant="warning">Archived</Badge>}
                            <Badge variant={v.status === 'active' ? 'success' : v.status === 'transferred' ? 'neutral' : 'error'} className="capitalize">
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
              <div className="grid gap-4">
                {preBookings.map((pb: any) => (
                  <Card key={pb.id} className="p-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 border-b border-slate-100 pb-4">
                      <div>
                        <h3 className="font-bold text-lg">{pb.variant?.name}</h3>
                        <div className="text-sm text-slate-500">Booking date: {new Date(pb.booking_date).toLocaleDateString()}</div>
                      </div>
                      <Badge variant={getStatusColor(pb.status) as any} className="w-fit text-sm capitalize">{pb.status.replace('_', ' ')}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="space-y-3">
                        {pb.expected_delivery_date && (
                          <div className="text-sm">
                            <span className="text-slate-500 block mb-0.5">Expected delivery</span>
                            <span className="font-medium">{new Date(pb.expected_delivery_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {pb.colour_preference && (
                          <div className="text-sm">
                            <span className="text-slate-500 block mb-0.5">Colour preference</span>
                            <span className="font-medium">{pb.colour_preference}</span>
                          </div>
                        )}
                        {pb.special_requirements && (
                          <div className="text-sm">
                            <span className="text-slate-500 block mb-0.5">Special requirements</span>
                            <span className="font-medium line-clamp-2">{pb.special_requirements}</span>
                          </div>
                        )}
                        {pb.inventory_unit && (
                          <div className="p-3 bg-slate-50 rounded text-sm">
                            <span className="font-medium block mb-1">Assigned Unit</span>
                            <span className="text-slate-600 block">Chassis: {pb.inventory_unit.chassis_number || 'N/A'}</span>
                            <span className="text-slate-600 block capitalize">Condition: {pb.inventory_unit.condition}</span>
                          </div>
                        )}
                      </div>
                      
                      {financeEnabled && (
                        <div className="space-y-3 p-4 bg-indigo-50/50 rounded-lg">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-800 mb-2">Finance details</h4>
                          <div className="text-sm">
                            <span className="text-slate-500 block mb-0.5">Deposit</span>
                            <Badge variant={pb.deposit_received ? 'success' : 'neutral'} className="mr-2">
                              {pb.deposit_received ? 'Received' : 'Not received'}
                            </Badge>
                            {pb.deposit_amount && <span className="font-medium ml-2">${pb.deposit_amount.toLocaleString()}</span>}
                          </div>
                          {pb.finance_type && (
                            <div className="text-sm text-slate-700">
                              Type: <span className="font-medium capitalize">{pb.finance_type.replace('_', ' ')}</span>
                            </div>
                          )}
                          {pb.finance_company && (
                            <div className="text-sm text-slate-700">
                              Company: <span className="font-medium">{pb.finance_company}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 justify-end pt-4 border-t border-slate-100">
                      {pb.status === 'delivered' && !pb.vehicle_id && (
                        <Button size="sm" onClick={() => navigate(`/sales/vehicles/new?preBookingId=${pb.id}`)}>Convert to sale →</Button>
                      )}
                      {!['delivered', 'cancelled'].includes(pb.status) && (
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => setStatusModalBooking({ ...pb, action: 'cancel' })}>Cancel booking</Button>
                      )}
                      {pb.status !== 'cancelled' && (
                        <Button variant="secondary" size="sm" onClick={() => setStatusModalBooking({ ...pb, action: 'update' })}>Update status</Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'communications' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Activity Feed</h2>
              <Button size="sm" onClick={() => setIsCommModalOpen(true)}>+ Log interaction</Button>
            </div>

            {isLoadingComms ? (
              <Skeleton className="h-64 w-full" />
            ) : !communications || communications.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-dashed border-slate-300">
                <p className="text-sm text-slate-500 mb-4">No interactions logged yet.<br/>Use '+ Log interaction' to record the first contact.</p>
                <Button variant="secondary" onClick={() => setIsCommModalOpen(true)}>+ Log interaction</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {communications.map((comm: any) => (
                  <Card key={comm.id} className="p-4 flex gap-4 items-start">
                    <div className="p-2 bg-slate-100 rounded-full mt-1">
                      {renderIcon(comm.interaction_type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900 capitalize">{comm.interaction_type.replace('_', ' ')}</span>
                          {comm.direction && (
                            <Badge variant="neutral" className="text-[10px] uppercase bg-slate-100 text-slate-600">
                              {comm.direction}
                            </Badge>
                          )}
                          {comm.log_type === 'followup' && (
                            <Badge variant="warning" className="text-[10px] uppercase">Follow-up</Badge>
                          )}
                          {comm.outcome && (
                            <Badge variant="neutral" className="bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium">
                              {comm.outcome.replace(/_/g, ' ')}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 whitespace-nowrap ml-4">
                          {new Date(comm.logged_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                      
                      <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded border border-slate-100 mb-3 whitespace-pre-wrap">
                        {comm.notes}
                      </div>

                      <div className="flex justify-between items-end mt-2">
                        <div className="space-y-1">
                          <div className="text-xs text-slate-500">Logged by: {comm.user_name || 'System'}</div>
                          {comm.pre_booking && (
                            <div className="text-xs text-indigo-600">
                              Re: {comm.pre_booking.variant?.name} booking
                            </div>
                          )}
                        </div>
                        
                        {comm.log_type === 'followup' && (
                          <div className="flex items-center gap-3">
                            <div className="text-sm">
                              {comm.follow_up_done ? (
                                <div className="flex items-center gap-2">
                                  <Badge variant="success" className="bg-green-100 text-green-700">Completed</Badge>
                                  <span className="text-slate-400 line-through text-xs">
                                    {new Date(comm.follow_up_date).toLocaleDateString()}
                                  </span>
                                </div>
                              ) : (() => {
                                const today = new Date();
                                today.setHours(0,0,0,0);
                                const fDate = new Date(comm.follow_up_date);
                                if (fDate < today) return <span className="text-red-600 font-medium text-xs">Follow up overdue: {fDate.toLocaleDateString()}</span>;
                                if (fDate.getTime() === today.getTime()) return <span className="text-amber-600 font-medium text-xs">Follow up due today</span>;
                                return <span className="text-slate-600 text-xs">Follow up on: {fDate.toLocaleDateString()}</span>;
                              })()}
                            </div>
                            {!comm.follow_up_done && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => markDoneMutation.mutate(comm.id)}
                                disabled={markDoneMutation.isPending}
                              >
                                Mark as done
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
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
