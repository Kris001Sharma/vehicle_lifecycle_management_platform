import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/features/auth/store/authStore';
import { createPreBooking } from '@/lib/db/preBookings';
import { getVariantsForSale } from '@/lib/db/vehicles';
import { getInventoryUnits } from '@/lib/db/inventory';
import { useFinanceEnabled } from '@/lib/catalog/financeConfig';
import { useToast } from '@/hooks/useToast';

export function PreBookingFormModal({ isOpen, onClose, customerId, customerName, tenantId, onSuccess }: any) {
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const financeEnabled = useFinanceEnabled();

  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedModelId, setSelectedModelId] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [colourPreference, setColourPreference] = useState('');
  const [specialRequirements, setSpecialRequirements] = useState('');
  
  const [linkStockUnit, setLinkStockUnit] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState('');

  const [depositReceived, setDepositReceived] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [financeType, setFinanceType] = useState('');
  const [financeCompany, setFinanceCompany] = useState('');
  const [loanReference, setLoanReference] = useState('');
  const [monthlyInstalment, setMonthlyInstalment] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: variantsData } = useQuery({
    queryKey: ['variants_for_sale', tenantId],
    queryFn: () => getVariantsForSale(tenantId!),
    enabled: !!tenantId && isOpen
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['inventory_stock', tenantId, selectedVariantId],
    queryFn: () => getInventoryUnits(tenantId!, { variantId: selectedVariantId, status: 'In stock' }),
    enabled: !!tenantId && isOpen && !!selectedVariantId && linkStockUnit
  });

  const categories = variantsData || [];
  const selectedCategory = categories.find((c: any) => c.id === selectedCategoryId);
  const selectedModel = selectedCategory?.models.find((m: any) => m.id === selectedModelId);
  const selectedVariant = selectedModel?.variants.find((v: any) => v.id === selectedVariantId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVariantId) return showToast("Please select a variant", "error");
    if (!bookingDate) return showToast("Booking date is required", "error");
    
    if (depositReceived && !depositAmount) {
      return showToast("Deposit amount is required if deposit was received", "error");
    }

    try {
      setIsSubmitting(true);
      const data = {
        customer_id: customerId,
        variant_id: selectedVariantId,
        booking_date: bookingDate,
        expected_delivery_date: expectedDeliveryDate || null,
        colour_preference: colourPreference || null,
        special_requirements: specialRequirements || null,
        inventory_unit_id: linkStockUnit && selectedUnitId ? selectedUnitId : null,
      } as any;

      if (financeEnabled) {
        data.deposit_received = depositReceived;
        data.deposit_amount = depositAmount ? Number(depositAmount) : null;
        data.finance_type = financeType || null;
        data.finance_company = financeCompany || null;
        data.loan_reference = loanReference || null;
        data.monthly_instalment = monthlyInstalment ? Number(monthlyInstalment) : null;
      }

      await createPreBooking(data, tenantId, user!.id);
      showToast("Pre-booking created", "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || "Failed to create booking", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`New pre-booking for ${customerName}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Variant</label>
              <select className="w-full px-3 py-2 border border-slate-200 rounded-md" value={selectedVariantId} onChange={(e) => setSelectedVariantId(e.target.value)}>
                <option value="">Select a variant</option>
                {selectedModel.variants.map((v: any) => (<option key={v.id} value={v.id}>{v.name}</option>))}
              </select>
            </div>
          )}

          {selectedVariant && (
             <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-md flex justify-between items-center text-sm">
               <span className="font-medium text-indigo-900">{selectedVariant.name}</span>
               <span className="font-semibold text-indigo-700">${selectedVariant.price?.toLocaleString()}</span>
             </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Booking date *</label>
            <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-md" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Expected delivery</label>
            <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-md" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} />
          </div>
        </div>

        <div>
           <label className="block text-sm font-medium text-slate-700 mb-1">Colour preference</label>
           <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-md placeholder-slate-400" placeholder="e.g. Pearl White" value={colourPreference} onChange={(e) => setColourPreference(e.target.value)} />
        </div>

        <div>
           <label className="block text-sm font-medium text-slate-700 mb-1">Special requirements</label>
           <textarea rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-md" value={specialRequirements} onChange={(e) => setSpecialRequirements(e.target.value)} />
        </div>

        <div className="pt-4 border-t border-slate-100">
           <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={linkStockUnit} onChange={(e) => setLinkStockUnit(e.target.checked)} disabled={!selectedVariantId} />
              <span className="text-sm font-medium text-slate-700 select-none">Link to stock unit</span>
           </label>
           {linkStockUnit && (
             <div>
               {!inventoryData || inventoryData.length === 0 ? (
                  <div className="text-sm text-amber-600 italic">No stock units available for this variant.</div>
               ) : (
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-md" value={selectedUnitId} onChange={(e) => setSelectedUnitId(e.target.value)}>
                    <option value="">Select an available unit</option>
                    {inventoryData.map((u: any) => (<option key={u.id} value={u.id}>{u.chassis_number || 'No chassis'} - {u.colour || 'No colour'} ({u.condition})</option>))}
                  </select>
               )}
             </div>
           )}
        </div>

        {financeEnabled && (
          <div className="pt-4 border-t border-slate-100 space-y-4">
             <h3 className="text-sm font-semibold text-slate-900">Finance & Deposit</h3>
             <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={depositReceived} onChange={(e) => setDepositReceived(e.target.checked)} />
                <span className="text-sm font-medium text-slate-700 select-none">Deposit received</span>
             </label>
             {depositReceived && (
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Deposit amount *</label>
                  <input type="number" min="0" className="w-full px-3 py-2 border border-slate-200 rounded-md" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} required={depositReceived}/>
               </div>
             )}
             <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Finance type</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-md" value={financeType} onChange={(e) => setFinanceType(e.target.value)}>
                    <option value="">None</option>
                    <option value="cash">Cash</option>
                    <option value="bank_loan">Bank Loan</option>
                    <option value="in_house">In-house Finance</option>
                    <option value="leasing">Leasing</option>
                  </select>
               </div>
               {['bank_loan', 'leasing'].includes(financeType) && (
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Finance company</label>
                    <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-md" value={financeCompany} onChange={(e) => setFinanceCompany(e.target.value)} />
                 </div>
               )}
             </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Loan reference</label>
                  <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-md" value={loanReference} onChange={(e) => setLoanReference(e.target.value)} />
               </div>
               <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Monthly instalment</label>
                  <input type="number" min="0" className="w-full px-3 py-2 border border-slate-200 rounded-md" value={monthlyInstalment} onChange={(e) => setMonthlyInstalment(e.target.value)} />
               </div>
             </div>
          </div>
        )}

        <div className="pt-6 mt-6 border-t border-slate-200 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting || !selectedVariantId}>Create pre-booking</Button>
        </div>
      </form>
    </Modal>
  );
}
