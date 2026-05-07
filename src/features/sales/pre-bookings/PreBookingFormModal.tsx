import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/features/auth/store/authStore';
import { createPreBooking } from '@/lib/db/preBookings';
import { getVariantsForSale } from '@/lib/db/vehicles';
import { getInventoryUnits } from '@/lib/db/inventory';
import { searchCustomers } from '@/lib/db/customers';
import { useFinanceEnabled } from '@/lib/catalog/financeConfig';
import { useToast } from '@/hooks/useToast';
import { useFormDirtyNavigation } from '@/hooks/useFormDirtyNavigation';
import { useDebounce } from '@/hooks/useDebounce';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Check, Search, User } from 'lucide-react';
import { cn } from '@/utils/cn';

export function PreBookingFormModal({ isOpen, onClose, customerId, customerName, tenantId, onSuccess }: any) {
  const { user } = useAuthStore();
  const { showToast } = useToast();
  const financeEnabled = useFinanceEnabled();

  const [internalSelectedCustomer, setInternalSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const debouncedCustomerSearch = useDebounce(customerSearch, 300);

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
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setInternalSelectedCustomer(null);
      setCustomerSearch('');
      setSelectedCategoryId('');
      setSelectedModelId('');
      setSelectedVariantId('');
      setColourPreference('');
      setSpecialRequirements('');
      setLinkStockUnit(false);
      setSelectedUnitId('');
      setDepositReceived(false);
      setDepositAmount('');
    }
  }, [isOpen]);

  const isDirty = useMemo(() => {
    return selectedCategoryId !== '' || 
           selectedModelId !== '' || 
           selectedVariantId !== '' || 
           colourPreference !== '' || 
           specialRequirements !== '' || 
           depositAmount !== '' ||
           linkStockUnit;
  }, [selectedCategoryId, selectedModelId, selectedVariantId, colourPreference, specialRequirements, depositAmount, linkStockUnit]);

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
    
    const finalCustomerId = customerId || internalSelectedCustomer?.id;
    if (!finalCustomerId) return showToast("Please select a customer", "error");
    if (!selectedVariantId) return showToast("Please select a variant", "error");
    if (!bookingDate) return showToast("Booking date is required", "error");
    
    if (depositReceived && !depositAmount) {
      return showToast("Deposit amount is required if deposit was received", "error");
    }

    try {
      setIsSubmitting(true);
      const data = {
        customer_id: finalCustomerId,
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
      resetBlocker();
      showToast("Pre-booking created", "success");
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || "Failed to create booking", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const { data: customerSearchData, isLoading: isSearchingCustomers } = useQuery({
    queryKey: ['customers_search', tenantId, debouncedCustomerSearch],
    queryFn: () => searchCustomers(debouncedCustomerSearch, tenantId!, 1, 10),
    enabled: !!tenantId && isOpen && !customerId && debouncedCustomerSearch.length > 0 && !internalSelectedCustomer
  });

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={handleClose} 
        title={customerId ? `New pre-booking for ${customerName}` : `New pre-booking`}
        footer={
          <>
            <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" form="pre-booking-form" disabled={isSubmitting || !selectedVariantId || (!customerId && !internalSelectedCustomer)}>Create pre-booking</Button>
          </>
        }
      >
        <form id="pre-booking-form" onSubmit={handleSubmit} className="space-y-6">
        
        {!customerId && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Customer</label>
            {internalSelectedCustomer ? (
              <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-indigo-900">{internalSelectedCustomer.name}</div>
                    <div className="text-[10px] text-indigo-600 font-medium">{internalSelectedCustomer.phone}</div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-indigo-600 hover:bg-indigo-100" onClick={() => setInternalSelectedCustomer(null)}>Change</Button>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Search customer by name or phone..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                />
                
                {customerSearchData?.rows && customerSearchData.rows.length > 0 && (
                  <div className="absolute z-[100] mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {customerSearchData.rows.map((c: any) => (
                      <div 
                        key={c.id} 
                        className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0"
                        onClick={() => {
                          setInternalSelectedCustomer(c);
                          setCustomerSearch('');
                        }}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-900">{c.name}</div>
                          <div className="text-[10px] text-slate-500">{c.phone}</div>
                        </div>
                        <Badge variant="neutral" className="text-[9px] uppercase">{c.customer_type.replace('_', ' ')}</Badge>
                      </div>
                    ))}
                  </div>
                )}
                
                {customerSearch.length > 2 && !isSearchingCustomers && customerSearchData?.rows?.length === 0 && (
                  <div className="absolute z-[100] mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg p-4 text-center text-xs text-slate-500">
                    No customers found. 
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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
            <label className="block text-sm font-medium text-slate-700 mb-2">Colour preference</label>
            {selectedVariant?.specs?.colour_options && selectedVariant.specs.colour_options.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {selectedVariant.specs.colour_options.map((opt: any) => (
                  <button
                    key={opt.name}
                    type="button"
                    onClick={() => setColourPreference(opt.name)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border text-left transition-all",
                      colourPreference === opt.name 
                        ? "bg-indigo-50 border-indigo-600 ring-1 ring-indigo-600" 
                        : "bg-white border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <div 
                      className="w-5 h-5 rounded-full border border-slate-200 shrink-0" 
                      style={{ backgroundColor: opt.hex }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-slate-900 truncate leading-tight">{opt.name}</div>
                    </div>
                    {colourPreference === opt.name && (
                      <Check className="w-3 h-3 text-indigo-600 shrink-0" />
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setColourPreference('Other')}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border text-left transition-all",
                    colourPreference === 'Other' 
                      ? "bg-indigo-50 border-indigo-600 ring-1 ring-indigo-600" 
                      : "bg-white border-slate-200 hover:border-slate-300"
                  )}
                >
                  <div className="w-5 h-5 rounded-full border border-slate-200 shrink-0 bg-gradient-to-tr from-slate-200 via-slate-100 to-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-400">?</div>
                  <div className="text-[11px] font-bold text-slate-900 leading-tight">Other</div>
                  {colourPreference === 'Other' && (
                    <Check className="w-3 h-3 text-indigo-600 shrink-0" />
                  )}
                </button>
              </div>
            ) : (
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-slate-200 rounded-md placeholder-slate-400" 
                placeholder="e.g. Pearl White" 
                value={colourPreference} 
                onChange={(e) => setColourPreference(e.target.value)} 
              />
            )}
            {colourPreference === 'Other' && (
               <input 
                 type="text" 
                 className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-md placeholder-slate-400 text-sm" 
                 placeholder="Specify custom colour..." 
                 autoFocus
                 onChange={(e) => setColourPreference(`Other: ${e.target.value}`)}
               />
            )}
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
      message="You have entered information for a pre-booking. Are you sure you want to discard these details?"
      confirmLabel="Discard and Leave"
      confirmVariant="destructive"
    />
  </>
);
}
