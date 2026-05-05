import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { searchCustomers } from '@/lib/db/customers';
import { useDebounce } from '@/hooks/useDebounce';
import { transferVehicleOwnership } from '@/lib/db/vehicles';
import { useToast } from '@/hooks/useToast';
import { useAuthStore } from '@/features/auth/store/authStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  vehicleId: string;
  vehicleNumber: string;
  currentCustomerId: string;
  tenantId: string;
  onSuccess: () => void;
}

export function TransferOwnershipModal({ isOpen, onClose, vehicleId, vehicleNumber, currentCustomerId, tenantId, onSuccess }: Props) {
  const { user } = useAuthStore();
  const { showToast } = useToast();
  
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  
  const debouncedSearch = useDebounce(search, 300);

  const { data: customerData, isLoading: searchLoading } = useQuery({
    queryKey: ['customers', tenantId, debouncedSearch, 1],
    queryFn: () => searchCustomers(debouncedSearch, tenantId, 1, 5),
    enabled: !!tenantId && debouncedSearch.length > 0 && isOpen && !selectedCustomer,
  });

  const mutation = useMutation({
    mutationFn: () => transferVehicleOwnership(vehicleId, selectedCustomer.id, transferDate, notes, tenantId, user!.id),
    onSuccess: (data: any) => {
      if (data.error === 'SAME_CUSTOMER') {
        showToast('Vehicle is already registered to this customer.', 'error');
        setIsConfirming(false);
        return;
      }
      if (data.error === 'CUSTOMER_NOT_FOUND') {
        showToast('Customer not found. Please search again.', 'error');
        setIsConfirming(false);
        return;
      }
      showToast('Ownership transferred successfully.', 'success');
      onSuccess();
      onClose();
      // Reset state for next open
      setSearch('');
      setSelectedCustomer(null);
      setTransferDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setIsConfirming(false);
    },
    onError: (err: any) => {
      showToast(err.message, 'error');
      setIsConfirming(false);
    }
  });

  const handleConfirm = () => {
    mutation.mutate();
  };

  const isSameCustomer = selectedCustomer?.id === currentCustomerId;

  if (isConfirming) {
    return (
      <Modal isOpen={isOpen} onClose={() => !mutation.isPending && setIsConfirming(false)} title="Confirm Transfer">
        <div className="py-4">
          <p className="text-slate-700 mb-6">
            Transfer <span className="font-mono font-semibold">{vehicleNumber}</span> to <span className="font-serif font-semibold">{selectedCustomer?.name}</span>?
            This action creates a permanent ownership record and cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsConfirming(false)} disabled={mutation.isPending}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={mutation.isPending}>
              {mutation.isPending ? 'Transferring...' : 'Confirm transfer'}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transfer vehicle ownership">
      <div className="py-4 space-y-6">
        
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between">
            Search new owner
            {selectedCustomer && (
              <span className="text-indigo-600 text-xs cursor-pointer hover:underline" onClick={() => setSelectedCustomer(null)}>Change</span>
            )}
          </label>
          
          {selectedCustomer ? (
            <div className="p-3 border border-indigo-200 bg-indigo-50 rounded-md">
              <div className="font-medium text-slate-900">{selectedCustomer.name}</div>
              <div className="text-sm text-slate-600">{selectedCustomer.phone}</div>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder="Search by name or phone"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              
              {search && search.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white shadow-lg rounded-md border border-slate-200 max-h-60 overflow-y-auto">
                  {searchLoading ? (
                    <div className="p-3 text-sm text-slate-500">Searching...</div>
                  ) : customerData?.rows && customerData.rows.length > 0 ? (
                    <ul className="divide-y divide-slate-100">
                      {customerData.rows.map((c: any) => (
                        <li 
                          key={c.id} 
                          className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                          onClick={() => setSelectedCustomer(c)}
                        >
                          <div>
                            <div className="font-medium text-slate-900 text-sm">{c.name}</div>
                            <div className="text-xs text-slate-500">{c.phone}</div>
                          </div>
                          {c.id === currentCustomerId && (
                            <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Current Owner</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-3 text-sm text-slate-500">No customers found.</div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {isSameCustomer && (
            <p className="text-amber-600 text-xs mt-1">This vehicle already belongs to this customer.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Transfer date</label>
          <input
            type="date"
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            value={transferDate}
            onChange={e => setTransferDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
          <textarea
            className="w-full px-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Reason for transfer, sale conditions, etc."
          ></textarea>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button 
            disabled={!selectedCustomer || isSameCustomer || !transferDate}
            onClick={() => setIsConfirming(true)}
          >
            Transfer Ownership
          </Button>
        </div>

      </div>
    </Modal>
  );
}
