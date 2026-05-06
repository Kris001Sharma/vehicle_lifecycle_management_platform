import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { createCommunication } from '@/lib/db/communications';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useToast } from '@/hooks/useToast';
import { Phone, MessageSquare, Mail, Building, User, FileText } from 'lucide-react';

export function CommunicationLogModal({ isOpen, onClose, customerId, tenantId, preBookings, onSuccess }: any) {
  const { user } = useAuthStore();
  const { showToast } = useToast();
  
  const [mode, setMode] = useState<'activity' | 'followup'>('activity');
  const [interactionType, setInteractionType] = useState('phone_call');
  const [direction, setDirection] = useState('outbound');
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState('');
  const [linkedBookingId, setLinkedBookingId] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const interactionTypes = [
    { id: 'phone_call', icon: Phone, label: 'Call' },
    { id: 'whatsapp', icon: MessageSquare, label: 'WhatsApp' },
    { id: 'email', icon: Mail, label: 'Email' },
    { id: 'site_visit', icon: Building, label: 'Site visit' },
    { id: 'in_person', icon: User, label: 'In person' },
    { id: 'other', icon: FileText, label: 'Other' },
  ];

  const outcomes = ['follow_up_scheduled', 'quotation_sent', 'awaiting_decision', 'booking_confirmed', 'no_further_action', 'other'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (notes.length < 10) return showToast("Notes must be at least 10 characters", "error");
    if (mode === 'followup' && !followUpDate) return showToast("Follow-up date is required", "error");
    
    if (mode === 'followup') {
      const today = new Date();
      today.setHours(0,0,0,0);
      if (new Date(followUpDate) < today) return showToast("Follow-up date cannot be in the past", "error");
    }

    try {
      setIsSubmitting(true);
      await createCommunication({
        customer_id: customerId,
        log_type: mode,
        interaction_type: interactionType,
        direction: ['phone_call', 'whatsapp', 'email'].includes(interactionType) ? direction : null,
        notes,
        outcome: outcome || null,
        pre_booking_id: linkedBookingId || null,
        follow_up_date: mode === 'followup' ? followUpDate : null
      }, tenantId, user!.id);
      
      showToast("Interaction logged", "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to log interaction', "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log interaction">
      <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
        <button 
          onClick={() => { setMode('activity'); setFollowUpDate(''); }}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'activity' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
        >
          Record activity
        </button>
        <button 
          onClick={() => setMode('followup')}
          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${mode === 'followup' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
        >
          Schedule follow-up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
           <label className="block text-sm font-medium text-slate-700 mb-2">Interaction type</label>
           <div className="grid grid-cols-3 gap-2">
             {interactionTypes.map(t => {
               const Icon = t.icon;
               return (
                 <button 
                   key={t.id} type="button" 
                   onClick={() => setInteractionType(t.id)}
                   className={`flex flex-col items-center justify-center p-3 border rounded-lg transition-colors ${interactionType === t.id ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                 >
                   <Icon className="w-5 h-5 mb-1" />
                   <span className="text-[10px] uppercase font-bold tracking-wider">{t.label}</span>
                 </button>
               );
             })}
           </div>
        </div>

        {['phone_call', 'whatsapp', 'email'].includes(interactionType) && (
          <div className="flex items-center gap-3">
             <label className="text-sm font-medium text-slate-700">Direction:</label>
             <div className="flex bg-slate-100 p-0.5 rounded text-sm">
               <button type="button" onClick={() => setDirection('inbound')} className={`px-3 py-1 rounded transition-colors ${direction === 'inbound' ? 'bg-white shadow-sm font-medium' : 'text-slate-600'}`}>Inbound</button>
               <button type="button" onClick={() => setDirection('outbound')} className={`px-3 py-1 rounded transition-colors ${direction === 'outbound' ? 'bg-white shadow-sm font-medium' : 'text-slate-600'}`}>Outbound</button>
             </div>
          </div>
        )}

        <div>
           <label className="block text-sm font-medium text-slate-700 mb-1">Notes *</label>
           <textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-md" value={notes} onChange={e => setNotes(e.target.value)} placeholder="What was discussed?" required minLength={10}></textarea>
           <p className="text-xs text-slate-500 mt-1">Minimum 10 characters.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Outcome</label>
             <select className="w-full px-3 py-2 border border-slate-200 rounded-md" value={outcome} onChange={e => setOutcome(e.target.value)}>
               <option value="">Select outcome...</option>
               {outcomes.map(o => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}
             </select>
           </div>
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Link to order</label>
             <select className="w-full px-3 py-2 border border-slate-200 rounded-md" value={linkedBookingId} onChange={e => setLinkedBookingId(e.target.value)}>
               <option value="">Not linked to an order</option>
               {preBookings?.map((pb: any) => <option key={pb.id} value={pb.id}>{pb.variant?.name} — {pb.status.replace('_', ' ')}</option>)}
             </select>
           </div>
        </div>

        {mode === 'followup' && (
          <div className="pt-4 border-t border-slate-100">
             <label className="block text-sm font-medium text-slate-700 mb-1">Follow-up Date *</label>
             <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-md" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} required min={new Date().toISOString().split('T')[0]} />
          </div>
        )}

        <div className="pt-6 mt-2 border-t border-slate-200 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting || notes.length < 10 || (mode === 'followup' && !followUpDate)}>Save</Button>
        </div>
      </form>
    </Modal>
  );
}
