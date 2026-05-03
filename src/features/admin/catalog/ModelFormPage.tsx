import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getEnabledCategories, createVehicleModel, updateVehicleModel } from '@/lib/db/catalogV2';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/hooks/useToast';
import { useFormDirtyBlocker } from '@/hooks/useFormDirtyBlocker';
import { supabase } from '@/lib/supabase/client';

const MANUFACTURERS = [
  'Tata', 'Mahindra', 'Toyota', 'Honda', 'Maruti Suzuki', 'Hyundai', 'Kia', 'MG', 
  'Volkswagen', 'Skoda', 'Mercedes-Benz', 'BMW', 'Audi', 'Force Motors', 
  'Ashok Leyland', 'Eicher', 'BharatBenz', 'Volvo', 'Scania', 'Piaggio', 
  'Bajaj', 'TVS', 'Hero', 'Royal Enfield', 'Ather', 'Ola Electric', 'Revolt', 'Yulu',
  'Tara', 'Olectra', 'JBM Auto'
];

export function ModelFormPage() {
  const { modelId } = useParams();
  const isEdit = !!modelId;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);
  const tenantId = user?.tenantId;

  const [isDirty, setIsDirty] = useState(false);
  const { reset: resetBlocker } = useFormDirtyBlocker(isDirty);

  const [formData, setFormData] = useState({
    manufacturer: '',
    name: '',
    category_id: '',
    use_type: '' as 'personal' | 'commercial' | 'both' | '',
    year_from: new Date().getFullYear(),
    year_to: null as number | null,
    description: ''
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['enabled_categories', tenantId],
    queryFn: () => getEnabledCategories(tenantId!),
    enabled: !!tenantId,
  });

  // Load existing model if editing
  useEffect(() => {
      if (isEdit && tenantId) {
          (supabase as any).from('vehicle_models').select('*').eq('id', modelId).eq('tenant_id', tenantId).single().then(({ data }: any) => {
              if (data) {
                  setFormData({
                      manufacturer: data.manufacturer || '',
                      name: data.name || '',
                      category_id: data.category_id || '',
                      use_type: data.use_type || '',
                      year_from: data.year_from || new Date().getFullYear(),
                      year_to: data.year_to || null,
                      description: data.description || ''
                  });
              }
          });
      }
  }, [modelId, isEdit, tenantId]);

  const handleFieldChange = (updates: Partial<typeof formData>) => {
      setFormData(prev => ({ ...prev, ...updates }));
      setIsDirty(true);
  };

  const mutation = useMutation({
    mutationFn: (data: typeof formData) => 
        isEdit 
            ? updateVehicleModel(modelId!, data, tenantId!) 
            : createVehicleModel(data, tenantId!),
    onSuccess: () => {
        resetBlocker();
        showToast('Model saved. Now add a variant to make it available for sales.', 'success');
        queryClient.invalidateQueries({ queryKey: ['vehicle_models'] });
        navigate('/admin/catalog');
    },
    onError: (err: any) => showToast(err.message, 'error')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category_id || !formData.use_type || !formData.manufacturer || !formData.name) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    mutation.mutate(formData);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 pb-20">
      <div className="mb-2">
        <button onClick={() => navigate('/admin/catalog')} className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
            ← Back to catalog
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">{isEdit ? "Edit model" : "Add vehicle model"}</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 max-w-2xl">
        <div className="space-y-6">
          
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Manufacturer</label>
            <input 
              list="manufacturers"
              className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="e.g. Tata, Mahindra"
              value={formData.manufacturer}
              onChange={e => handleFieldChange({ manufacturer: e.target.value })}
            />
            <p className="text-[11px] font-medium text-slate-500 mt-1">Type to search or enter a new manufacturer</p>
            <datalist id="manufacturers">
              {MANUFACTURERS.map(m => <option key={m} value={m} />)}
            </datalist>
          </div>

          <div className="space-y-1">
            <Input 
              label="Model name"
              placeholder=""
              value={formData.name}
              onChange={e => handleFieldChange({ name: e.target.value })}
            />
            <p className="text-[11px] font-medium text-slate-500 mt-1">e.g. Ace EV, Innova Crysta, Activa 6G</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Vehicle category</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {categoriesLoading ? (
                  <>
                    <Skeleton className="h-[76px] w-full rounded-lg" />
                    <Skeleton className="h-[76px] w-full rounded-lg" />
                    <Skeleton className="h-[76px] w-full rounded-lg" />
                  </>
              ) : categories?.map(cat => (
                <div 
                  key={cat.id}
                  onClick={() => handleFieldChange({ category_id: cat.id })}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${formData.category_id === cat.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <div className="font-medium text-slate-900">{cat.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{cat.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">Primary use</label>
            <div className="flex gap-2">
              {['personal', 'commercial', 'both'].map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleFieldChange({ use_type: type as any })}
                  className={`px-6 py-2 rounded-full text-sm font-medium border transition-all capitalize ${formData.use_type === type ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <Input 
                label="Model year"
                type="number"
                placeholder="From year"
                value={formData.year_from}
                onChange={e => handleFieldChange({ year_from: parseInt(e.target.value) })}
                />
                <div>
                <label className="block text-sm font-medium text-transparent mb-1">To</label>
                <input 
                    type="number"
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="Present"
                    value={formData.year_to || ''}
                    onChange={e => handleFieldChange({ year_to: e.target.value ? parseInt(e.target.value) : null })}
                />
                </div>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-1">Leave 'to year' blank if this model is still currently available</p>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700">Description (optional)</label>
            <textarea 
               rows={3}
               className="w-full p-3 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
               value={formData.description}
               onChange={e => handleFieldChange({ description: e.target.value })}
            />
            <p className="text-[11px] font-medium text-slate-500 mt-1">Internal notes about this model. Not shown to customers.</p>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-100">
          <button type="button" onClick={() => navigate('/admin/catalog')} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Cancel
          </button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save model'}
          </Button>
        </div>
      </form>
    </div>
  );
}
