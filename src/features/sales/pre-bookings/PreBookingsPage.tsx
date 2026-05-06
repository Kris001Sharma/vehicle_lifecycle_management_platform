import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getPreBookings } from '@/lib/db/preBookings';
import { useFinanceEnabled } from '@/lib/catalog/financeConfig';
import { PreBookingFormModal } from './PreBookingFormModal';
import { PreBookingStatusModal } from './PreBookingStatusModal';

export function PreBookingsPage() {
  const { tenantId } = useAuthStore(s => s.user!) || {};
  const navigate = useNavigate();
  const financeEnabled = useFinanceEnabled();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [statusModalBooking, setStatusModalBooking] = useState<any | null>(null);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['pre_bookings_all', tenantId, filter],
    queryFn: () => getPreBookings(tenantId!, { status: filter }),
    enabled: !!tenantId
  });

  const { data: allBookings } = useQuery({
    queryKey: ['pre_bookings_all', tenantId, 'All'],
    queryFn: () => getPreBookings(tenantId!, { status: 'All' }),
    enabled: !!tenantId && filter !== 'All'
  });

  const counts: any = { enquiry: 0, confirmed: 0, ordered: 0, in_transit: 0 };
  let hasOverdueTransit = false;
  
  const processList = filter === 'All' ? bookings : allBookings;
  
  if (processList) {
    processList.forEach((pb: any) => {
      if (counts[pb.status] !== undefined) counts[pb.status]++;
      if (pb.status === 'in_transit' && pb.expected_delivery_date) {
        if (new Date(pb.expected_delivery_date) < new Date()) hasOverdueTransit = true;
      }
    });
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'enquiry': return 'neutral';
      case 'confirmed': return 'info';
      case 'ordered': return 'info';
      case 'in_transit': return 'warning';
      case 'delivered': return 'success';
      case 'cancelled': return 'error';
      default: return 'neutral';
    }
  };

  return (
    <PageWrapper 
      title="Pre-bookings" 
      actions={<Button onClick={() => setIsModalOpen(true)}>+ New pre-booking</Button>}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Enquiry', value: counts?.enquiry },
          { label: 'Confirmed', value: counts?.confirmed },
          { label: 'Ordered', value: counts?.ordered },
          { label: 'In transit', value: counts?.in_transit, alert: hasOverdueTransit }
        ].map(s => (
          <Card key={s.label} className={`p-4 text-center ${s.alert ? 'border-amber-400 bg-amber-50/50' : ''}`}>
             <div className="text-xl font-bold">{s.value || 0}</div>
             <div className={`text-xs uppercase tracking-wider ${s.alert ? 'text-amber-700 font-bold' : 'text-slate-500'}`}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="flex bg-slate-100 p-1 rounded-md mb-6 w-fit overflow-x-auto">
        {['All', 'Enquiry', 'Confirmed', 'Ordered', 'In transit', 'Delivered', 'Cancelled'].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-medium rounded transition-colors ${filter === f ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          [...Array(6)].map((_, i) => <Skeleton key={i} className="h-64 w-full" />)
        ) : !bookings || bookings.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">
             No pre-bookings found for this filter.
             <div className="mt-4"><Button variant="secondary" onClick={() => setIsModalOpen(true)}>Create one now</Button></div>
          </div>
        ) : (
          bookings.map((pb: any) => {
            const isPastExpected = pb.expected_delivery_date && new Date(pb.expected_delivery_date) < new Date() && pb.status !== 'delivered' && pb.status !== 'cancelled';
            return (
              <Card key={pb.id} className="p-5 flex flex-col h-full hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <Link to={`/sales/customers/${pb.customer_id}`} className="font-bold text-indigo-700 hover:underline line-clamp-1 pr-2">
                    {pb.customer?.name}
                  </Link>
                  <Badge variant={getStatusColor(pb.status) as any} className="capitalize shrink-0">
                    {pb.status.replace('_', ' ')}
                  </Badge>
                </div>

                <div className="mb-4">
                  <div className="text-sm font-semibold">{pb.variant?.name}</div>
                  <div className="text-xs text-slate-500 flex flex-wrap gap-1 mt-1">
                    <span>{pb.model?.manufacturer}</span>&bull;
                    <span className="capitalize">{pb.model?.category?.name}</span>&bull;
                    <span>{pb.powertrain?.display_label}</span>
                  </div>
                </div>

                <div className="text-xs space-y-2 mb-4 grow">
                  <div className="flex justify-between border-b border-slate-50 pb-2">
                    <span className="text-slate-500">Booked:</span>
                    <span className="font-medium text-slate-900">{new Date(pb.booking_date).toLocaleDateString()}</span>
                  </div>
                  <div className={`flex justify-between pb-2 ${pb.inventory_unit ? 'border-b border-slate-50' : ''}`}>
                    <span className="text-slate-500">Expected:</span>
                    <span className={`font-medium ${isPastExpected ? 'text-red-600 font-bold' : 'text-slate-900'}`}>
                      {pb.expected_delivery_date ? new Date(pb.expected_delivery_date).toLocaleDateString() : 'Not set'}
                    </span>
                  </div>
                  {pb.inventory_unit && (
                    <div className="p-2 bg-slate-50 rounded mt-2">
                       <span className="text-slate-500 block mb-0.5">Stock unit</span>
                       <span className="font-mono">{pb.inventory_unit.chassis_number || 'N/A'}</span> <span className="text-slate-400">|</span> <span>{pb.inventory_unit.colour || 'No colour'}</span> <span className="text-slate-400">|</span> <span className="capitalize text-[10px]">{pb.inventory_unit.condition}</span>
                    </div>
                  )}
                  {financeEnabled && (pb.deposit_received || pb.finance_type) && (
                    <div className="p-2 bg-indigo-50/50 rounded mt-2 flex justify-between items-center">
                       {pb.deposit_received ? <Badge variant="success" className="text-[10px]">Deposit Recv</Badge> : <span/>}
                       {pb.finance_type && <span className="font-medium capitalize text-slate-700">{pb.finance_type.replace('_', ' ')}</span>}
                    </div>
                  )}
                </div>

                <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-100">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/sales/customers/${pb.customer_id}`)}>View cust</Button>
                  {pb.status === 'delivered' && !pb.vehicle_id && (
                    <Button size="sm" onClick={() => navigate(`/sales/vehicles/new?preBookingId=${pb.id}`)}>Convert to sale →</Button>
                  )}
                  {pb.status !== 'cancelled' && pb.status !== 'delivered' && (
                    <Button variant="secondary" size="sm" onClick={() => setStatusModalBooking({ ...pb, action: 'update' })}>Update status</Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      <PreBookingFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tenantId={tenantId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['pre_bookings_all', tenantId] });
        }}
      />

      {statusModalBooking && (
        <PreBookingStatusModal
          isOpen={!!statusModalBooking}
          onClose={() => setStatusModalBooking(null)}
          booking={statusModalBooking}
          tenantId={tenantId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['pre_bookings_all', tenantId] });
          }}
        />
      )}
    </PageWrapper>
  );
}
