import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getPreBookings } from '@/lib/db/preBookings';
import { PreBookingFormModal } from './PreBookingFormModal';
import { PreBookingStatusModal } from './PreBookingStatusModal';

export function PreBookingsPage() {
  const { tenantId } = useAuthStore(s => s.user!) || {};
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
      actions={<Button onClick={() => setIsModalOpen(true)}>+ New booking</Button>}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Enquiry', value: counts?.enquiry },
          { label: 'Confirmed', value: counts?.confirmed },
          { label: 'Ordered', value: counts?.ordered },
          { label: 'In transit', value: counts?.in_transit, alert: hasOverdueTransit }
        ].map(s => (
          <Card key={s.label} className={`p-3 text-center border-slate-200 shadow-sm ${s.alert ? 'border-amber-400 bg-amber-50/50' : ''}`}>
             <div className="text-xl font-bold text-slate-900 mb-0.5 tracking-tight">{s.value || 0}</div>
             <div className={`text-[10px] uppercase font-semibold tracking-widest ${s.alert ? 'text-amber-700' : 'text-slate-500'}`}>{s.label}</div>
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

      <div className="sm:hidden space-y-3 pb-6">
        {isLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
        ) : !bookings || bookings.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">No bookings found.</div>
        ) : (
          bookings.map((pb: any) => {
            const isPastExpected = pb.expected_delivery_date && new Date(pb.expected_delivery_date) < new Date() && pb.status !== 'delivered' && pb.status !== 'cancelled';
            return (
              <div 
                key={pb.id} 
                className="block bg-white p-4 rounded-xl border border-slate-200 shadow-sm active:bg-slate-50 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm font-bold text-slate-900 tracking-tight">{pb.customer?.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="text-xs font-semibold text-slate-500">{pb.variant?.name}</div>
                      {pb.colour_preference && (() => {
                        const opt = pb.variant?.specs?.colour_options?.find((o: any) => o.name === pb.colour_preference);
                        return opt ? (
                          <div 
                            className="w-2.5 h-2.5 rounded-full border border-slate-200" 
                            style={{ backgroundColor: opt.hex }}
                            title={opt.name}
                          />
                        ) : null;
                      })()}
                    </div>
                  </div>
                  <Badge variant={getStatusColor(pb.status) as any} className="capitalize px-1.5 py-0 border-0 font-bold text-[9px] uppercase tracking-wider">
                    {pb.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-[10px] font-medium text-slate-500 pt-2 border-t border-slate-50">
                  <div>Booked: {new Date(pb.booking_date).toLocaleDateString()}</div>
                  <div className={isPastExpected ? 'text-red-500 font-bold' : ''}>
                    Exp: {pb.expected_delivery_date ? new Date(pb.expected_delivery_date).toLocaleDateString() : '-'}
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-3">
                  {pb.status !== 'cancelled' && pb.status !== 'delivered' && (
                    <button 
                      onClick={() => setStatusModalBooking({ ...pb, action: 'update' })}
                      className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest"
                    >
                      Status
                    </button>
                  )}
                  <Link to={`/sales/customers/${pb.customer_id}`} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Customer
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Card className="hidden sm:block border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Variant</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Booked</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Expected</th>
                <th scope="col" className="relative px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : !bookings || bookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No pre-bookings found for this filter.
                    <div className="mt-4"><Button variant="secondary" size="sm" onClick={() => setIsModalOpen(true)}>Create one now</Button></div>
                  </td>
                </tr>
              ) : (
                bookings.map((pb: any) => {
                  const isPastExpected = pb.expected_delivery_date && new Date(pb.expected_delivery_date) < new Date() && pb.status !== 'delivered' && pb.status !== 'cancelled';
                  return (
                    <tr key={pb.id} className="hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-0 growable-row">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-900 tracking-tight">{pb.customer?.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-slate-900">{pb.variant?.name}</div>
                          {pb.colour_preference && (() => {
                            const opt = pb.variant?.specs?.colour_options?.find((o: any) => o.name === pb.colour_preference);
                            return opt ? (
                              <div 
                                className="w-3 h-3 rounded-full border border-slate-200" 
                                style={{ backgroundColor: opt.hex }}
                                title={opt.name}
                              />
                            ) : null;
                          })()}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">{pb.model?.manufacturer}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={getStatusColor(pb.status) as any} className="capitalize px-2 py-0.5 border-0 font-semibold text-[10px] uppercase tracking-wider">
                          {pb.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[12px] font-medium text-slate-500">{new Date(pb.booking_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-[12px] font-medium">
                        <span className={isPastExpected ? 'text-red-600 font-bold' : 'text-slate-600'}>
                          {pb.expected_delivery_date ? new Date(pb.expected_delivery_date).toLocaleDateString() : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex gap-3 justify-end items-center">
                          <Link to={`/sales/customers/${pb.customer_id}`} className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs uppercase tracking-wider">
                            View
                          </Link>
                          {pb.status !== 'cancelled' && pb.status !== 'delivered' && (
                            <button 
                              onClick={() => setStatusModalBooking({ ...pb, action: 'update' })}
                              className="text-slate-400 hover:text-slate-900 transition-colors"
                            >
                              Status
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

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
