import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { updatePreBookingStatus, cancelPreBooking } from '@/lib/db/preBookings';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useToast } from '@/hooks/useToast';

export function PreBookingStatusModal({ isOpen, onClose, booking, tenantId, onSuccess }: any) {
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const [selectedNextStatus, setSelectedNextStatus] = useState<string | null>(null);
  const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);
  const [notesInput, setNotesInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const transitions: Record<string, { label: string; status: string; color: any }[]> = {
    'enquiry': [{ label: 'Mark as confirmed', status: 'confirmed', color: 'info' }],
    'confirmed': [
      { label: 'Mark as ordered', status: 'ordered', color: 'primary' },
      { label: 'Mark as cancelled', status: 'cancelled', color: 'error' }
    ],
    'ordered': [
      { label: 'Mark as in transit', status: 'in_transit', color: 'warning' },
      { label: 'Mark as cancelled', status: 'cancelled', color: 'error' }
    ],
    'in_transit': [
      { label: 'Mark as delivered', status: 'delivered', color: 'success' },
      { label: 'Mark as cancelled', status: 'cancelled', color: 'error' }
    ]
  };

  const availableTransitions = transitions[booking?.status] || [];

  const handleConfirm = async () => {
    if (!selectedNextStatus) return;
    
    // For specific action override (e.g. Cancel booking button from the card)
    const targetStatus = booking.action === 'cancel' ? 'cancelled' : selectedNextStatus;

    try {
      setIsSubmitting(true);
      if (targetStatus === 'cancelled') {
        if (!notesInput) return showToast("Cancellation reason is required", "error");
        await cancelPreBooking(booking.id, notesInput, tenantId, user!.id);
      } else {
        const updateData: any = {};
        if (targetStatus === 'delivered') {
          updateData.actual_delivery_date = dateInput;
        }
        await updatePreBookingStatus(booking.id, targetStatus, updateData, tenantId, user!.id);
      }
      showToast(`Status updated to ${targetStatus.replace('_', ' ')}`, "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Update failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Removed targetStatus variable

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update booking status">
      <div className="space-y-6">
        <div className="text-center py-4 bg-slate-50 rounded-lg">
          <div className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-2">Current Status</div>
          <Badge className="text-base px-4 py-1.5 capitalize" variant={booking?.status === 'delivered' ? 'success' : booking?.status === 'cancelled' ? 'error' : "neutral"}>
            {booking?.status?.replace('_', ' ')}
          </Badge>
        </div>

        {booking?.action === 'cancel' ? (
          <div className="space-y-4">
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Cancellation Reason *</label>
                <textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-md" value={notesInput} onChange={e => setNotesInput(e.target.value)} placeholder="Required..."></textarea>
             </div>
             <p className="text-sm text-amber-600">This will release any reserved inventory unit.</p>
          </div>
        ) : !selectedNextStatus ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Select next step</label>
            <div className="space-y-3">
              {availableTransitions.map(t => (
                <Button key={t.status} variant="secondary" className={`w-full justify-start text-${t.color}-600 border-${t.color}-200 hover:bg-${t.color}-50`} onClick={() => setSelectedNextStatus(t.status)}>
                  {t.label}
                </Button>
              ))}
              {availableTransitions.length === 0 && (
                <div className="text-sm text-slate-500 italic">No further status updates available.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <h3 className="font-semibold text-lg text-slate-900">Confirm transition to <span className="capitalize">{selectedNextStatus.replace('_', ' ')}</span>?</h3>
            
            {selectedNextStatus === 'delivered' && (
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Actual delivery date *</label>
                 <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-md" value={dateInput} onChange={e => setDateInput(e.target.value)} required />
              </div>
            )}
            {selectedNextStatus === 'cancelled' && (
              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Cancellation Reason *</label>
                 <textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-md" value={notesInput} onChange={e => setNotesInput(e.target.value)} required></textarea>
              </div>
            )}
            
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
               <Button variant="secondary" onClick={() => setSelectedNextStatus(null)} disabled={isSubmitting}>Back</Button>
               <Button onClick={handleConfirm} disabled={isSubmitting || (selectedNextStatus==='cancelled' && !notesInput) || (selectedNextStatus==='delivered' && !dateInput)}>
                 Confirm update
               </Button>
            </div>
          </div>
        )}
        
        {(!selectedNextStatus && booking?.action !== 'cancel') && (
           <div className="flex justify-end pt-4 border-t border-slate-100">
             <Button variant="secondary" onClick={onClose}>Cancel</Button>
           </div>
        )}
        {(booking?.action === 'cancel') && (
           <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
             <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Back</Button>
             <Button variant="ghost" className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700" onClick={handleConfirm} disabled={isSubmitting || !notesInput}>
               Confirm cancellation
             </Button>
           </div>
        )}
      </div>
    </Modal>
  );
}
