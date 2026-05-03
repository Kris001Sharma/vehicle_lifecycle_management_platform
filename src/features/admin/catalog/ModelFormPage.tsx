import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getEnabledCategories, createVehicleModel, updateVehicleModel, getTenantCatalogConfig } from '@/lib/db/catalogV2';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/hooks/useToast';
import { useFormDirtyBlocker } from '@/hooks/useFormDirtyBlocker';
import { supabase } from '@/lib/supabase/client';
import { ArrowLeft, Save } from 'lucide-react';

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
  
  const { data: config } = useQuery({
    queryKey: ['tenant_catalog_config', tenantId],
    queryFn: () => getTenantCatalogConfig(tenantId!),
    enabled: !!tenantId
  });

  const manufacturers = useMemo(() => {
    return (config?.manufacturers || []).slice().sort();
  }, [config?.manufacturers]);

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
    <PageWrapper
      title={isEdit ? "Edit Model" : "Add Vehicle Model"}
      actions={
        <Button variant="secondary" onClick={() => navigate('/admin/catalog')}>
            <ArrowLeft className="w-4 h-4" /> Back
        </Button>
      }
    >
      <div className="max-w-3xl mx-auto space-y-8 pb-32">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2 mb-6">Model Details</h2>
            <div className="space-y-6">
              
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700">Manufacturer *</label>
                <input 
                  list="manufacturers-list"
                  className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="Select or type manufacturer..."
                  value={formData.manufacturer}
                  onChange={e => handleFieldChange({ manufacturer: e.target.value })}
                />
                <p className="text-[11px] font-medium text-slate-500 mt-1">
                    Select from supported manufacturers or type to add a new one.
                </p>
                <datalist id="manufacturers-list">
                  {manufacturers.map((m: string) => <option key={m} value={m} />)}
                </datalist>
              </div>

              <div className="space-y-1">
                <Input 
                  label="Model name *"
                  placeholder="e.g. Ace EV, Innova Crysta"
                  value={formData.name}
                  onChange={e => handleFieldChange({ name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Vehicle category *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categoriesLoading ? (
                      <>
                        <Skeleton className="h-[76px] w-full rounded-lg" />
                        <Skeleton className="h-[76px] w-full rounded-lg" />
                      </>
                  ) : categories?.map(cat => (
                    <div 
                      key={cat.id}
                      onClick={() => handleFieldChange({ category_id: cat.id })}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${formData.category_id === cat.id ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                    >
                      <div className="font-medium text-slate-900">{cat.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{cat.description}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Primary use *</label>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1 opacity-100 flex items-center h-[20px]">Discontinued in</label>
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
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => navigate('/admin/catalog')}>
                Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              <Save className="w-4 h-4" />
              {mutation.isPending ? 'Saving...' : 'Save model'}
            </Button>
          </div>
        </form>
      </div>
    </PageWrapper>
  );
}
