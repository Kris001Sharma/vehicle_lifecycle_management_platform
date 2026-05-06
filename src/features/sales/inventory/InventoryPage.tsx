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
      actions={<Button onClick={() => setIsModalOpen(true)}>+ Add unit</Button>}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'In stock', value: summary?.in_stock },
          { label: 'Reserved', value: summary?.reserved },
          { label: 'Demo', value: summary?.demo },
          { label: 'Total', value: summary?.total }
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
             <div className="text-xl font-bold">{isSummaryLoading ? '-' : s.value || 0}</div>
             <div className="text-xs text-slate-500 uppercase tracking-wider">{s.label}</div>
          </Card>
        ))}
      </div>

      <div className="flex bg-slate-100 p-1 rounded-md mb-6 w-fit">
        {['All', 'In stock', 'Reserved', 'Demo', 'Written off'].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${filter === f ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
          >
            {f}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Variant</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Model</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Chassis No.</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Colour</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Condition</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Received</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
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
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{u.variant?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                       {u.variant?.model?.manufacturer} {u.variant?.model?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">{u.chassis_number || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">{u.colour || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge variant={u.condition === 'new' ? 'success' : u.condition === 'demo' ? 'info' : 'warning'} className="capitalize">{u.condition}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge variant={
                        u.status === 'in_stock' ? 'success' : 
                        u.status === 'reserved' ? 'info' : 
                        u.status === 'demo' ? 'neutral' : 
                        u.status === 'sold' ? 'neutral' : 'error'
                      } className="capitalize">{u.status.replace('_', ' ')}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{u.received_date ? new Date(u.received_date).toLocaleDateString() : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right flex gap-3 justify-end items-center text-sm font-medium">
                      {/* Placeholder for View/Edit actions if extended further */}
                      <span className="text-indigo-600 hover:text-indigo-900 cursor-pointer">View</span>
                      {u.status !== 'sold' && <span className="text-indigo-600 hover:text-indigo-900 cursor-pointer">Edit</span>}
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
