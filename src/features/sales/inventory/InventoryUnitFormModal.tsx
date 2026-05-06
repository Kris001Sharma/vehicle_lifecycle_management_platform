import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { createInventoryUnit } from '@/lib/db/inventory';
import { getVariantsForSale } from '@/lib/db/vehicles';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useToast } from '@/hooks/useToast';
import { useFormDirtyNavigation } from '@/hooks/useFormDirtyNavigation';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function InventoryUnitFormModal({ isOpen, onClose, tenantId, onSuccess }: any) {
  const { user } = useAuthStore();
  const { showToast } = useToast();

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  
  const [chassisNumber, setChassisNumber] = useState('');
  const [colour, setColour] = useState('');
  const [condition, setCondition] = useState('new');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const isDirty = useMemo(() => {
     return selectedCategoryId !== '' ||
            selectedModelId !== '' ||
            selectedVariantId !== '' ||
            chassisNumber !== '' ||
            colour !== '' ||
            notes !== '';
  }, [selectedCategoryId, selectedModelId, selectedVariantId, chassisNumber, colour, notes]);

  const { shouldShowDialog, handleConfirmNavigation, handleCancelNavigation, resetBlocker } = useFormDirtyNavigation(isDirty);

  const handleClose = () => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      onClose();
    }
  };

  const { data: variantsData } = useQuery({
    queryKey: ['variants_for_sale', tenantId],
    queryFn: () => getVariantsForSale(tenantId!),
    enabled: !!tenantId && isOpen
  });

  const categories = variantsData || [];
  const selectedCategory = categories.find((c: any) => c.id === selectedCategoryId);
  const selectedModel = selectedCategory?.models.find((m: any) => m.id === selectedModelId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariantId) return showToast("Select a variant first", "error");

    try {
      setIsSubmitting(true);
      const res = await createInventoryUnit({
        variant_id: selectedVariantId,
        chassis_number: chassisNumber || null,
        colour: colour || null,
        condition,
        received_date: receivedDate || null,
        notes: notes || null
      }, tenantId, user!.id);
      
      if (res.error) throw new Error(res.error);
      
      resetBlocker();
      showToast("Unit added to inventory", "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to add inventory unit', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={handleClose} 
        title="Add to inventory"
        footer={
          <>
            <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" form="inventory-unit-form" disabled={isSubmitting || !selectedVariantId}>Add to inventory</Button>
          </>
        }
      >
        <form id="inventory-unit-form" onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-4 pt-2">
          <div>
             <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
             <div className="flex flex-wrap gap-2">
               {categories.map((c: any) => (
                 <button
                   key={c.id}
                   type="button"
                   onClick={() => { setSelectedCategoryId(c.id); setSelectedModelId(''); setSelectedVariantId(''); }}
                   className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                     selectedCategoryId === c.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                   }`}
                 >
                   {c.name}
                 </button>
               ))}
             </div>
          </div>
          
          {selectedCategory && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-md" value={selectedModelId} onChange={(e) => { setSelectedModelId(e.target.value); setSelectedVariantId(''); }}>
                <option value="">Select a model</option>
                {selectedCategory.models.map((m: any) => (<option key={m.id} value={m.id}>{m.manufacturer} {m.name}</option>))}
              </select>
            </div>
          )}

          {selectedModel && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Variant *</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-md" value={selectedVariantId} onChange={(e) => setSelectedVariantId(e.target.value)} required>
                <option value="">Select a variant</option>
                {selectedModel.variants.map((v: any) => (<option key={v.id} value={v.id}>{v.name}</option>))}
              </select>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Chassis number</label>
            <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-md font-mono text-sm" value={chassisNumber} onChange={e => setChassisNumber(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Colour</label>
            <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-md" value={colour} onChange={e => setColour(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Condition *</label>
            <select className="w-full px-3 py-2 border border-slate-200 rounded-md capitalize" value={condition} onChange={e => setCondition(e.target.value)} required>
              <option value="new">New</option>
              <option value="demo">Demo</option>
              <option value="refurbished">Refurbished</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Received date</label>
            <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-md" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} />
          </div>
        </div>

        <div>
           <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
           <textarea rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-md" value={notes} onChange={e => setNotes(e.target.value)}></textarea>
        </div>
      </form>
    </Modal>

    <ConfirmDialog
      isOpen={shouldShowDialog || showCancelConfirm}
      onClose={() => {
        handleCancelNavigation();
        setShowCancelConfirm(false);
      }}
      onConfirm={() => {
        handleConfirmNavigation();
        setShowCancelConfirm(false);
        resetBlocker();
        onClose();
      }}
      title="Unsaved Changes"
      message="You have unsaved changes in this inventory form. Are you sure you want to discard them?"
      confirmLabel="Discard and Leave"
      confirmVariant="destructive"
    />
  </>
);
}
