import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getPreBookings } from '@/lib/db/preBookings';
import { PreBookingFormModal } from './PreBookingFormModal';
import { PreBookingStatusModal } from './PreBookingStatusModal';
import { MessageSquare, CheckCircle2, FileText, Truck, ArrowRight, Settings2 } from 'lucide-react';
import { cn } from '@/utils/cn';

export function PreBookingsPage() {
  const navigate = useNavigate();
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
      actions={
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="rounded-full px-6 font-bold shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          + New booking
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Enquiry', value: counts?.enquiry, icon: <MessageSquare className="w-4 h-4" /> },
          { label: 'Confirmed', value: counts?.confirmed, icon: <CheckCircle2 className="w-4 h-4" /> },
          { label: 'Ordered', value: counts?.ordered, icon: <FileText className="w-4 h-4" /> },
          { label: 'In transit', value: counts?.in_transit, icon: <Truck className="w-4 h-4" />, alert: hasOverdueTransit }
        ].map(s => (
          <Card 
            key={s.label} 
            className={cn(
              "p-5 border shadow-sm relative overflow-hidden group transition-all flex flex-col justify-between",
              s.alert ? "border-amber-200 bg-amber-50/30 hover:border-amber-300" : "border-slate-100 hover:border-indigo-100 hover:shadow-md"
            )}
          >
            <div className={cn(
              "absolute -right-3 -top-3 w-12 h-12 rounded-full transition-colors z-0",
              s.alert ? "bg-amber-100/50 group-hover:bg-amber-100" : "bg-slate-50 group-hover:bg-indigo-50"
            )} />
            <div className={cn(
              "absolute right-3 top-3 transition-colors z-10",
              s.alert ? "text-amber-400 group-hover:text-amber-500" : "text-slate-300 group-hover:text-indigo-200"
            )}>
              {s.icon}
            </div>
            
            <div className="relative z-10">
              <h3 className={cn(
                "text-[10px] font-bold uppercase tracking-widest mb-2",
                s.alert ? "text-amber-700" : "text-slate-500"
              )}>
                {s.label}
              </h3>
              <div className="text-3xl font-bold text-slate-900 tracking-tight">
                {isLoading ? <Skeleton className="h-9 w-12" /> : (s.value || 0)}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex border-b border-slate-200 overflow-x-auto min-w-0 hide-scrollbar scroll-smooth">
          {[
            { id: 'All', short: 'All' },
            { id: 'Enquiry', short: 'Enq' },
            { id: 'Confirmed', short: 'Conf' },
            { id: 'Ordered', short: 'Ord' },
            { id: 'In transit', short: 'Transit' },
            { id: 'Delivered', short: 'Del' },
            { id: 'Cancelled', short: 'Can' }
          ].map(f => (
            <button 
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex-none sm:flex-1 whitespace-nowrap px-4 sm:px-2 py-2 border-b-2 font-semibold text-[10px] sm:text-xs uppercase tracking-wider transition-colors text-center ${
                filter === f.id 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="hidden sm:inline">{f.id}</span>
              <span className="sm:hidden">{f.short}</span>
            </button>
          ))}
        </div>
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
                onClick={() => navigate(`/sales/customers/${pb.customer_id}?tab=pre-bookings`)}
                className="block bg-white p-4 rounded-xl border border-slate-200 shadow-sm active:bg-slate-50 transition-colors cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 tracking-tight">{pb.customer?.name}</div>
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
                  <Badge variant={getStatusColor(pb.status) as any} className="capitalize px-1.5 py-0 border-0 font-semibold text-[10px] uppercase tracking-wider">
                    {pb.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex justify-between items-center text-[10px] font-medium text-slate-500 pt-2 border-t border-slate-50">
                  <div>Booked: {new Date(pb.booking_date).toLocaleDateString()}</div>
                  <div className={isPastExpected ? 'text-red-500 font-bold' : ''}>
                    Exp: {pb.expected_delivery_date ? new Date(pb.expected_delivery_date).toLocaleDateString() : '-'}
                  </div>
                </div>
                  <div className="mt-3 flex justify-end gap-2 items-center" onClick={(e) => e.stopPropagation()}>
                    {pb.status === 'ordered' && (
                      <Link 
                        to={`/sales/vehicles/new?preBookingId=${pb.id}`}
                        state={{ preBooking: pb }}
                      >
                        <Button 
                          size="sm"
                          variant="secondary"
                          className="h-7 px-3 text-[9px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100"
                        >
                          Convert to Sale
                        </Button>
                      </Link>
                    )}
                    {pb.status !== 'cancelled' && pb.status !== 'delivered' && (
                      <Button 
                        size="sm"
                        variant="ghost"
                        className="h-7 px-3 text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50"
                        onClick={() => setStatusModalBooking({ ...pb, action: 'update' })}
                      >
                       <Settings2 className="w-3 h-3 mr-1" />
                        Change Status
                      </Button>
                    )}
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
                <th scope="col" className="relative px-4 py-3 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider pr-8">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100 font-sans">
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
                    <tr 
                      key={pb.id} 
                      onClick={() => navigate(`/sales/customers/${pb.customer_id}?tab=pre-bookings`)}
                      className="group hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-0 cursor-pointer"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-semibold text-slate-900 tracking-tight">
                          {pb.customer?.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-semibold text-slate-900">{pb.variant?.name}</div>
                          {pb.colour_preference && (() => {
                            const opt = pb.variant?.specs?.colour_options?.find((o: any) => o.name === pb.colour_preference);
                            return opt ? (
                              <div 
                                className="w-2.5 h-2.5 rounded-full border border-slate-200 shadow-sm" 
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
                        <span className={isPastExpected ? 'text-red-500' : 'text-slate-600'}>
                          {pb.expected_delivery_date ? new Date(pb.expected_delivery_date).toLocaleDateString() : '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2 justify-end items-center">
                          {pb.status === 'ordered' && (
                            <Link 
                              to={`/sales/vehicles/new?preBookingId=${pb.id}`} 
                              state={{ preBooking: pb }}
                            >
                              <Button 
                                size="sm"
                                variant="secondary"
                                className="h-8 px-4 text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100 shadow-sm transition-transform active:scale-95"
                              >
                                Convert to Sale
                              </Button>
                            </Link>
                          )}
                          {pb.status !== 'cancelled' && pb.status !== 'delivered' && (
                            <Button 
                              size="sm"
                              variant="ghost"
                              className="h-8 px-4 text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 rounded-lg group/btn"
                              onClick={() => setStatusModalBooking({ ...pb, action: 'update' })}
                            >
                              <Settings2 className="w-3.5 h-3.5 mr-1.5 transition-transform group-hover/btn:rotate-45" />
                              Change Status
                            </Button>
                          )}
                          <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-indigo-300 transition-all group-hover:translate-x-1 ml-2" />
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
