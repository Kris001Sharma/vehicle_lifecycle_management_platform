import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getInventorySummary, getInventoryUnits } from '@/lib/db/inventory';
import { InventoryUnitFormModal } from './InventoryUnitFormModal';
import { Warehouse, Clock, Zap, Layers } from 'lucide-react';

export function InventoryPage() {
  const { tenantId } = useAuthStore(s => s.user!) || {};
  const [filter, setFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: summary, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['inventory_summary', tenantId],
    queryFn: () => getInventorySummary(tenantId!),
    enabled: !!tenantId
  });

  const { data: units, isLoading: isUnitsLoading } = useQuery({
    queryKey: ['inventory_units', tenantId, filter],
    queryFn: () => getInventoryUnits(tenantId!, { status: filter }),
    enabled: !!tenantId
  });

  return (
    <PageWrapper 
      title="Inventory" 
      actions={
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="rounded-full px-6 font-bold shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          + Add unit
        </Button>
      }
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'In stock', value: summary?.in_stock, icon: <Warehouse className="w-4 h-4" /> },
          { label: 'Reserved', value: summary?.reserved, icon: <Clock className="w-4 h-4" /> },
          { label: 'Demo', value: summary?.demo, icon: <Zap className="w-4 h-4" /> },
          { label: 'Total units', value: summary?.total, icon: <Layers className="w-4 h-4" /> }
        ].map(s => (
          <Card key={s.label} className="p-5 border border-slate-100 shadow-sm relative overflow-hidden group hover:border-indigo-100 hover:shadow-md transition-all flex flex-col justify-between">
            <div className="absolute -right-3 -top-3 w-12 h-12 bg-slate-50 rounded-full group-hover:bg-indigo-50 transition-colors z-0" />
            <div className="absolute right-3 top-3 text-slate-300 group-hover:text-indigo-200 transition-colors z-10">
              {s.icon}
            </div>
            
            <div className="relative z-10">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                {s.label}
              </h3>
              <div className="text-3xl font-bold text-slate-900 tracking-tight">
                {isSummaryLoading ? <Skeleton className="h-9 w-12" /> : (s.value || 0)}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex border-b border-slate-200 min-w-0">
          {['All', 'In stock', 'Reserved', 'Demo', 'Written off'].map(f => (
            <button 
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 whitespace-nowrap px-2 sm:px-4 py-2 border-b-2 font-semibold text-[10px] sm:text-xs uppercase tracking-wider transition-colors text-center ${
                filter === f 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <span className="hidden xs:inline">{f}</span>
              <span className="xs:hidden">{f === 'Written off' ? 'Retired' : f}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sm:hidden space-y-3 pb-6">
        {isUnitsLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
        ) : !units || units.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">No units found.</div>
        ) : (
          units.map((u: any) => (
            <div 
              key={u.id} 
              className="block bg-white p-4 rounded-xl border border-slate-200 shadow-sm active:bg-slate-50 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-mono font-bold text-slate-900 text-xs tracking-wider">{u.chassis_number || 'No Chassis'}</div>
                  <div className="text-sm font-bold text-slate-800 mt-0.5">{u.variant?.name}</div>
                </div>
                <Badge variant={
                  u.status === 'in_stock' ? 'success' : 
                  u.status === 'reserved' ? 'info' : 
                  'neutral'
                } className="px-1.5 py-0 font-bold uppercase tracking-wider text-[9px] border-0">
                  {u.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-[10px] font-medium text-slate-500 pt-2 border-t border-slate-50">
                <div className="flex gap-2">
                   <span className="bg-slate-50 border border-slate-100 px-1.5 rounded-sm uppercase tracking-tighter text-[9px] font-bold text-slate-500">{u.colour || 'No Colour'}</span>
                   <span className="bg-indigo-50 text-indigo-600 px-1.5 rounded-sm uppercase tracking-tighter text-[9px] font-bold">{u.condition}</span>
                </div>
                <div className="flex gap-3">
                  <span className="text-indigo-600 font-bold uppercase tracking-widest text-[9px]">Edit</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Card className="hidden sm:block border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Variant</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Model</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Chassis No.</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Colour</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Condition</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-4 py-3 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Received</th>
                <th scope="col" className="relative px-4 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {isUnitsLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="px-6 py-4"><Skeleton className="h-6 w-full" /></td>
                  </tr>
                ))
              ) : !units || units.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">No inventory units found for this filter.</td>
                </tr>
              ) : (
                units.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-slate-900 tracking-tight">{u.variant?.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                       <span className="font-semibold text-slate-900">{u.variant?.model?.manufacturer}</span> <span className="text-slate-300 mx-1">/</span> <span className="font-medium text-slate-600">{u.variant?.model?.name}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[12px] font-mono font-medium text-slate-600 tracking-tight">{u.chassis_number || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-700">{u.colour || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <Badge variant={u.condition === 'new' ? 'success' : u.condition === 'demo' ? 'info' : 'warning'} className="capitalize px-2 py-0.5 border-0 font-semibold text-[10px] uppercase tracking-wider">{u.condition}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <Badge variant={
                        u.status === 'in_stock' ? 'success' : 
                        u.status === 'reserved' ? 'info' : 
                        u.status === 'demo' ? 'neutral' : 
                        u.status === 'sold' ? 'neutral' : 'error'
                      } className="capitalize px-2 py-0.5 border-0 font-semibold text-[10px] uppercase tracking-wider">{u.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-[12px] font-medium text-slate-500">{u.received_date ? new Date(u.received_date).toLocaleDateString() : '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-right flex gap-3 justify-end items-center text-sm font-medium">
                      <span className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs uppercase tracking-wider cursor-pointer">View</span>
                      {u.status !== 'sold' && <span className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs uppercase tracking-wider cursor-pointer">Edit</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <InventoryUnitFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tenantId={tenantId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['inventory_summary', tenantId] });
          queryClient.invalidateQueries({ queryKey: ['inventory_units', tenantId] });
        }}
      />
    </PageWrapper>
  );
}
