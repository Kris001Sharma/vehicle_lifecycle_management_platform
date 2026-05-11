import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useToast } from '@/hooks/useToast';
import { serviceRecordSchema, ServiceRecordInput } from '@/lib/validations/service';
import { createServiceRecord, updateServiceRecord, closeServiceRecord } from '@/lib/db/service';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useIsOnline } from '@/hooks/useIsOnline';
import { enqueueServiceRecord } from '@/lib/offline/queue';
import { getVehicleWithFullDetails } from '@/lib/db/vehicles';
import { useQuery } from '@tanstack/react-query';
import { Trash2, Plus, ArrowLeft, Wrench, Smartphone, CreditCard, ShieldCheck } from 'lucide-react';
import { cn } from '@/utils/cn';

const FileUploader = ({ entityType, entityId }: any) => (
  <div className="p-4 border border-slate-200 border-dashed rounded-lg text-slate-400 bg-slate-50 text-center text-sm">
    File uploader component (Phase 10) for {entityType} {entityId}
  </div>
);

type JobCardFormProps = {
  vehicleId: string;
  recordId?: string;
  initialData?: any;
};

export function JobCardForm({ vehicleId, recordId, initialData }: JobCardFormProps) {
  const { user } = useAuthStore();
  const tenantId = user?.tenantId;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isOnline = useIsOnline();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', vehicleId, tenantId],
    queryFn: () => getVehicleWithFullDetails(vehicleId, tenantId!),
    enabled: !!vehicleId && !!tenantId
  });

  const isEditMode = !!recordId;
  const isClosed = initialData?.status === 'completed';

  const { register, control, handleSubmit, watch, formState: { errors }, trigger, setFocus, setValue } = useForm<ServiceRecordInput>({
    resolver: zodResolver(serviceRecordSchema),
    defaultValues: {
      visit_date: initialData?.visit_date ? initialData.visit_date.split('T')[0] : new Date().toISOString().split('T')[0],
      mileage_at_visit: initialData?.mileage_at_visit || undefined,
      visit_type: initialData?.visit_type || 'routine',
      complaint: initialData?.complaint || '',
      diagnosis: initialData?.diagnosis || '',
      work_done: initialData?.work_done || '',
      technician_name: initialData?.technician_name || '',
      next_service_km: initialData?.next_service_km || undefined,
      next_service_date: initialData?.next_service_date ? initialData.next_service_date.split('T')[0] : undefined,
      labor_cost: initialData?.labor_cost || 0,
      parts: initialData?.parts || [],
    }
  });

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'parts'
  });

  const visitType = watch('visit_type');
  const parts = watch('parts');
  const laborCost = watch('labor_cost') || 0;

  const totalPartsCost = parts?.reduce((acc, p) => acc + ((p.price || 0) * (p.quantity || 1)), 0) || 0;
  const totalCost = totalPartsCost + laborCost;

  // AMC Benefit Logic: Auto-calculate zero-cost for routine services
  const hasAmc = vehicle?.has_amc;
  const isRoutine = visitType === 'routine';
  const amcApplicable = hasAmc && isRoutine;

  useEffect(() => {
    if (amcApplicable) {
      setValue('labor_cost', 0);
      parts?.forEach((part, index) => {
        if (!part.is_amc_benefit) {
          update(index, { ...part, price: 0, is_amc_benefit: true });
        }
      });
    }
  }, [amcApplicable, setValue, parts?.length]);

  if (isClosed) {
    return (
      <div className="space-y-6">
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4">
          <p className="text-amber-800 font-medium">This job card is closed and cannot be edited.</p>
        </div>
        <Card className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
             <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Visit Date</p>
                <p className="text-sm font-medium">{initialData.visit_date}</p>
             </div>
             <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Visit Type</p>
                <p className="text-sm font-medium capitalize">{initialData.visit_type}</p>
             </div>
             <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Bill</p>
                <p className="text-lg font-mono font-bold text-slate-900 tracking-tighter">₹{initialData.total_cost?.toLocaleString() || '0'}</p>
             </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Complaint</p>
              <p className="text-sm whitespace-pre-wrap">{initialData.complaint || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Diagnosis</p>
              <p className="text-sm whitespace-pre-wrap">{initialData.diagnosis || '-'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Work Performed</p>
              <p className="text-sm whitespace-pre-wrap">{initialData.work_done || '-'}</p>
            </div>
          </div>
        </Card>
        <Button variant="ghost" onClick={() => navigate(`/service/vehicle/${vehicleId}`)}>
           <ArrowLeft className="w-4 h-4 mr-2" /> Back to vehicle
        </Button>
      </div>
    );
  }

  const onSubmitQueue = async (data: ServiceRecordInput) => {
    if (!isOnline) {
      try {
        await enqueueServiceRecord(data, vehicleId, user!.id, tenantId!);
        showToast('Job card saved locally. It will sync automatically when you reconnect.', 'success');
        navigate(`/service/vehicle/${vehicleId}`);
      } catch (err: any) {
         showToast(err.message, 'error');
      }
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        const res = await updateServiceRecord(recordId, data, data.parts || [], tenantId!);
        if (res.error === 'RECORD_CLOSED') {
          showToast('This job card was closed by someone else and can no longer be edited.', 'error');
          navigate(`/service/vehicle/${vehicleId}`);
          return;
        } else if (res.error) {
          throw new Error('Failed to update job card');
        }
        showToast('Job card saved.', 'success');
        navigate(`/service/vehicle/${vehicleId}`);
      } else {
        const res = await createServiceRecord(data, vehicleId, data.parts || [], tenantId!, user!.id);
        if (res.warning === 'PARTS_SAVE_FAILED') {
          showToast('Job card saved but some parts could not be recorded. Please edit the job card and re-enter the parts.', 'warning');
        } else if (!res.record) {
           throw new Error('Failed to create job card');
        } else {
           showToast('Job card saved.', 'success');
        }
        navigate(`/service/vehicle/${vehicleId}`);
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseAttempt = async () => {
    const isValid = await trigger();
    if (!isValid) return;

    const workDone = watch('work_done');
    if (!workDone || workDone.trim() === '') {
       showToast('Work done is required before closing', 'error');
       setFocus('work_done');
       return;
    }
    
    setCloseDialogOpen(true);
  };

  const handleCloseConfirm = async () => {
    setIsSubmitting(true);
    try {
      const data = watch();
      // first update
      const resUpdate = await updateServiceRecord(recordId!, data, data.parts || [], tenantId!);
      if (resUpdate.error) throw new Error('Failed to update before closing');

      const res = await closeServiceRecord(recordId!, tenantId!, user!.id);
      if (res.error === 'ALREADY_CLOSED') {
         showToast('This job card is already closed.', 'error');
      } else if (res.error === 'WORK_DONE_REQUIRED') {
         showToast('Work done required before closing', 'error');
         setFocus('work_done');
         return;
      } else if (res.error) {
         throw new Error('Failed to close job card');
      } else {
         showToast('Job card closed.', 'success');
      }
      navigate(`/service/vehicle/${vehicleId}`);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
      setCloseDialogOpen(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmitQueue)}>
      {!isOnline && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
          <p className="text-amber-800 font-medium">You are offline. This job card will be saved locally and submitted when your connection is restored.</p>
        </div>
      )}

      {/* Section 1: Visit details */}
      <Card className="p-6 relative overflow-hidden">
        {amcApplicable && (
          <div className="absolute top-0 right-0 p-2 px-4 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-bl-xl flex items-center gap-1.5 shadow-sm animate-in fade-in slide-in-from-top-1">
            <ShieldCheck className="w-3.5 h-3.5" /> AMC Active - Benefits Applied
          </div>
        )}
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Visit details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Visit Date *</label>
            <input type="date" max={new Date().toISOString().split('T')[0]} className="block w-full border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" {...register('visit_date')} />
            {errors.visit_date && <p className="text-red-500 text-xs mt-1">{errors.visit_date.message}</p>}
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
               <label className="block text-sm font-medium text-slate-700">Mileage at visit</label>
               <span className="text-xs text-slate-500 inline-block font-mono">km</span>
            </div>
            <input type="number" min="0" className="block w-full border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" {...register('mileage_at_visit', { valueAsNumber: true })} />
          </div>
          <div className="md:col-span-2 mt-2">
            <label className="block text-sm font-medium text-slate-700 mb-2">Visit Type *</label>
            <div className="flex flex-wrap gap-2">
               {['routine', 'repair', 'inspection', 'warranty'].map(type => (
                 <label key={type} className={`cursor-pointer px-4 py-2 text-sm font-medium rounded-md border text-center flex-1
                   ${watch('visit_type') === type ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}
                 `}>
                    <input type="radio" value={type} className="sr-only" {...register('visit_type')} />
                    <span className="capitalize">{type}</span>
                 </label>
               ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Section 2: Visual Inspection (Mockup) */}
      <Card className="p-6">
         <h3 className="text-lg font-semibold text-slate-800 mb-4">Visual Inspection (Drive-Lane)</h3>
         <div className="bg-slate-50 border border-slate-200 border-dashed rounded-xl p-6 text-center relative overflow-hidden group">
            <div className="absolute inset-0 bg-slate-100 opacity-50 flex items-center justify-center">
               <span className="text-[10rem] text-slate-200">🚙</span>
            </div>
            <div className="relative z-10 flex flex-col items-center justify-center">
               <Wrench className="w-8 h-8 text-slate-400 mb-2" />
               <p className="font-medium text-slate-700">Digital Vehicle Inspection tool</p>
               <p className="text-sm text-slate-500 mb-4">Tap on vehicle areas to mark damage or attach photos.</p>
               
               <div className="flex flex-wrap gap-2 justify-center max-w-sm mx-auto">
                 <button type="button" className="text-xs px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-full font-medium text-slate-600 hover:text-indigo-600 hover:border-indigo-200">Front Bumper</button>
                 <button type="button" className="text-xs px-3 py-1.5 bg-rose-50 border border-rose-200 shadow-sm rounded-full font-medium text-rose-600">Left Fender (Scratch)</button>
                 <button type="button" className="text-xs px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-full font-medium text-slate-600 hover:text-indigo-600 hover:border-indigo-200">Rear Bumper</button>
                 <button type="button" className="text-xs px-3 py-1.5 bg-white border border-slate-200 shadow-sm rounded-full font-medium text-slate-600 hover:text-indigo-600 hover:border-indigo-200">Windshield</button>
               </div>
               
               <button type="button" className="mt-6 text-sm font-medium text-indigo-600 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 hover:bg-slate-50">
                 + Add Inspection Photo
               </button>
            </div>
         </div>
      </Card>

      {/* Section 3: Complaint and findings */}
      <Card className="p-6">
         <h3 className="text-lg font-semibold text-slate-800 mb-4">Complaint and findings</h3>
         <div className="space-y-4">
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Complaint</label>
             <textarea rows={3} placeholder="Describe what the customer reported" className="block w-full border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2" {...register('complaint')}></textarea>
           </div>
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Diagnosis</label>
             <textarea rows={3} placeholder="Describe what was found on inspection" className="block w-full border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2" {...register('diagnosis')}></textarea>
           </div>
         </div>
      </Card>

      {/* Section 3: Work performed */}
      <Card className="p-6">
         <h3 className="text-lg font-semibold text-slate-800 mb-4">Work performed</h3>
         <div className="space-y-4">
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Work done</label>
             <textarea rows={4} placeholder="Describe all work done in detail" className="block w-full border border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm p-2" {...register('work_done')}></textarea>
             {errors.work_done && <p className="text-red-500 text-xs mt-1">{errors.work_done.message}</p>}
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Technician Name</label>
               <input type="text" placeholder="Technician's name" className="block w-full border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" {...register('technician_name')} />
             </div>
             <div>
               <div className="flex justify-between items-center mb-1">
                 <label className="block text-sm font-medium text-slate-700">Labor Charge</label>
                 {amcApplicable && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 rounded uppercase">AMC Cover</span>}
               </div>
               <div className="relative">
                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                 <input 
                   type="number" 
                   className={cn(
                     "block w-full pl-7 border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm font-mono",
                     amcApplicable && "bg-emerald-50 border-emerald-200 text-emerald-700 cursor-not-allowed"
                   )} 
                   placeholder="0.00"
                   {...register('labor_cost', { valueAsNumber: true })} 
                   readOnly={amcApplicable}
                   value={amcApplicable ? 0 : watch('labor_cost')}
                 />
               </div>
             </div>
           </div>
         </div>
      </Card>

      {/* Section 4: Parts and materials */}
      <Card className="p-6">
         <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-slate-800">Parts and materials</h3>
            <div className="flex flex-col items-end">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Running Parts Total</div>
               <div className="text-xl font-mono font-bold text-slate-900">₹{totalPartsCost.toLocaleString()}</div>
            </div>
         </div>
         <div className="space-y-3">
           {fields.map((field, index) => (
             <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-4 bg-slate-50 border border-slate-100 rounded-xl relative group">
                <div className="md:col-span-3">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Category & Name</label>
                  <div className="flex gap-2">
                    <select className="block w-24 border-slate-300 rounded-md shadow-sm text-xs py-1.5" {...register(`parts.${index}.part_category`)}>
                      {['Engine', 'Battery', 'Brakes', 'Electrical', 'Body', 'Tyres', 'Transmission', 'Cooling', 'Suspension', 'Other'].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <input type="text" placeholder="Part name *" className="block flex-1 border-slate-300 rounded-md shadow-sm text-xs py-1.5" {...register(`parts.${index}.part_name`)} />
                  </div>
                </div>

                <div className="md:col-span-2">
                   <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Action</label>
                   <select className="block w-full border-slate-300 rounded-md shadow-sm text-xs py-1.5" {...register(`parts.${index}.action`)}>
                    {['replaced', 'repaired', 'inspected', 'adjusted'].map(action => (
                      <option key={action} value={action}>{action}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-1">
                   <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Qty</label>
                   <input type="number" min="1" className="block w-full border-slate-300 rounded-md shadow-sm text-xs py-1.5 font-mono" {...register(`parts.${index}.quantity`, { valueAsNumber: true })} />
                </div>

                <div className="md:col-span-2">
                   <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1 flex items-center justify-between">
                     Unit Price
                     {amcApplicable && <span className="text-emerald-600 bg-emerald-50 px-1 rounded-[2px] leading-none">AMC</span>}
                   </label>
                   <div className="relative">
                     <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">₹</span>
                     <input 
                       type="number" 
                       step="0.01"
                       className={cn(
                         "block w-full pl-5 border-slate-300 rounded-md shadow-sm text-xs py-1.5 font-mono",
                         amcApplicable && "bg-emerald-50 border-emerald-200 text-emerald-700 cursor-not-allowed"
                       )} 
                       placeholder="0.00"
                       {...register(`parts.${index}.price`, { valueAsNumber: true })} 
                       readOnly={amcApplicable}
                       value={amcApplicable ? 0 : watch(`parts.${index}.price`)}
                     />
                   </div>
                </div>

                <div className="md:col-span-3">
                   <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Notes</label>
                   <input type="text" placeholder="Notes" className="block w-full border-slate-300 rounded-md shadow-sm text-xs py-1.5" {...register(`parts.${index}.notes`)} />
                </div>

                <button type="button" onClick={() => remove(index)} className="absolute -top-2 -right-2 md:relative md:top-auto md:right-auto p-2 bg-white md:bg-transparent shadow-sm md:shadow-none border border-slate-100 md:border-none text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full md:rounded-md transition-colors self-center">
                  <Trash2 className="w-4 h-4" />
                </button>
             </div>
           ))}
           {errors.parts && <p className="text-red-500 text-xs mt-1">Please check part details.</p>}
           <div className="mt-2 flex justify-between items-center">
             <Button type="button" variant="secondary" size="sm" onClick={() => append({ part_category: 'Other', part_name: '', action: 'replaced', quantity: 1, price: amcApplicable ? 0 : 0, is_amc_benefit: amcApplicable, notes: '' })}>
               <Plus className="w-4 h-4 mr-1" /> Add part
             </Button>
           </div>
         </div>
      </Card>

      {/* Section 5: Next service */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Next service</h3>
        <p className="text-xs text-slate-500 mb-4">Auto-calculated from variant schedule. Override if needed.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Next service KM</label>
              <input type="number" min="0" className="block w-full border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" {...register('next_service_km', { valueAsNumber: true })} />
           </div>
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Next service Date</label>
              <input type="date" className="block w-full border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" {...register('next_service_date')} />
           </div>
        </div>
      </Card>

      {/* Section 6: Attachments */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Attachments</h3>
        {!isOnline ? (
          <p className="text-sm text-slate-500 italic">File uploads require an internet connection.</p>
        ) : isEditMode ? (
          <FileUploader entityType="service_record" entityId={recordId} />
        ) : (
          <p className="text-sm text-slate-500 italic">Save the job card first to add attachments.</p>
        )}
      </Card>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-white border-t border-slate-200 p-4 px-6 md:px-8 z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col md:flex-row justify-between items-center max-w-4xl mx-auto gap-4 md:gap-0">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => navigate(`/service/vehicle/${vehicleId}`)} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Discard
            </button>
            
            <div className="hidden md:flex items-center gap-2 pl-4 border-l border-slate-200">
               <input type="checkbox" id="send-sms" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" defaultChecked />
               <label htmlFor="send-sms" className="text-sm font-medium text-slate-700 flex items-center cursor-pointer">
                  <Smartphone className="w-4 h-4 mr-1 text-slate-400" /> Notify customer
               </label>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Final Invoice Total</p>
               <p className="text-xl font-black text-slate-900 tracking-tighter">₹{totalCost.toLocaleString()}</p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button type="submit" variant="secondary" disabled={isSubmitting} className="w-24">
                  {isOnline ? 'Save' : 'Save locally'}
              </Button>
              
              {isOnline && isEditMode && (
                <Button type="button" variant="destructive" onClick={handleCloseAttempt} disabled={isSubmitting} className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" /> Finalize & Invoice
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Spacer to avoid bottom bar occlusion */}
      <div className="h-20" />
      
      <ConfirmDialog
        isOpen={closeDialogOpen}
        onClose={() => setCloseDialogOpen(false)}
        onConfirm={handleCloseConfirm}
        title="Close this job card?"
        message="Once closed, this job card cannot be edited or reopened. Make sure all work performed has been recorded in the 'Work performed' section."
      />
    </form>
  );
}
