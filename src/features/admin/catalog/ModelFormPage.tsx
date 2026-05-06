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
import { useFormDirtyNavigation } from '@/hooks/useFormDirtyNavigation';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { supabase } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/Badge';
import { Save, CheckCircle, AlertTriangle, ExternalLink, Plus, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';

export function ModelFormPage() {
  const { modelId } = useParams();
  const isEdit = !!modelId;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);
  const tenantId = user?.tenantId;

  const [isDirty, setIsDirty] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const { shouldShowDialog, handleConfirmNavigation, handleCancelNavigation, resetBlocker } = useFormDirtyNavigation(isDirty);

  const [formData, setFormData] = useState({
    manufacturer: '',
    name: '',
    category_id: '',
    subcategory: null as string | null,
    use_type: '' as 'personal' | 'commercial' | 'both' | '',
    year_from: new Date().getFullYear(),
    year_to: null as number | null,
    description: '',
    is_active: true
  });

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['enabled_categories', tenantId],
    queryFn: () => getEnabledCategories(tenantId!),
    enabled: !!tenantId,
  });
  
  const selectedCategory = categories?.find((c: any) => c.id === formData.category_id);
  const subcategories = selectedCategory?.subcategories || [];
  
  const showSubcategories = subcategories.length > 0;
  
  // Custom description mapping
  const categoryDescriptions: Record<string, string> = {
    'two-wheeler': 'Motorcycles, scooters, mopeds, electric bicycles',
    'three-wheeler': 'Auto-rickshaws, cargo three-wheelers',
    'passenger-car': 'Hatchbacks, sedans, SUVs, MUVs, MPVs, crossovers',
    'lcv': 'Minivans, mini trucks, pickup trucks, cargo vans, school vans, ambulances',
    'mhcv': 'City buses, intercity buses, school buses, rigid trucks, tippers',
    'construction-special': 'Excavators, loaders, tractors (coming soon)',
  };

  const { data: config } = useQuery({
    queryKey: ['tenant_catalog_config', tenantId],
    queryFn: () => getTenantCatalogConfig(tenantId!),
    enabled: !!tenantId
  });

  const { data: variants } = useQuery({
      queryKey: ['model_variants', modelId],
      queryFn: async () => {
          if (!modelId || !tenantId) return [];
          const { data, error } = await (supabase as any).from('vehicle_variants').select('*, powertrain:powertrain_types(*)').eq('model_id', modelId).eq('tenant_id', tenantId);
          if (error) throw error;
          return data;
      },
      enabled: !!modelId && !!tenantId
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
                      subcategory: data.subcategory || null,
                      use_type: data.use_type || '',
                      year_from: data.year_from || new Date().getFullYear(),
                      year_to: data.year_to || null,
                      description: data.description || '',
                      is_active: data.is_active ?? true
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
        setIsConfirmModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['vehicle_models'] });
        setShowSuccessModal(true);
    },
    onError: (err: any) => {
        showToast(err.message, 'error');
        setIsConfirmModalOpen(false);
    }
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category_id || !formData.use_type || !formData.manufacturer || !formData.name) {
        showToast('Please fill all required fields', 'error');
        return;
    }
    const catObj = categories?.find((c: any) => c.id === formData.category_id);
    if (catObj && catObj.subcategories?.length > 0 && !formData.subcategory) {
        showToast('Please select a vehicle type to continue', 'error');
        return;
    }
    
    if (isEdit) {
        setIsConfirmModalOpen(true);
    } else {
        mutation.mutate(formData);
    }
  };

  const confirmSave = () => {
      mutation.mutate(formData);
  };

  return (
    <PageWrapper
      title={isEdit ? "Edit Model" : "Add Vehicle Model"}
      backLink={{ label: 'Catalog', path: '/admin/catalog' }}
    >
      <div className="space-y-8 pb-32">
        <form onSubmit={onSubmit} className="space-y-6">
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
                  ) : categories?.map(cat => {
                    const isConstruction = cat.slug === 'construction-special';
                    return (
                    <div 
                      key={cat.id}
                      onClick={(e) => {
                        if (isConstruction) {
                          e.preventDefault();
                          return;
                        }
                        handleFieldChange({ category_id: cat.id, subcategory: null });
                      }}
                      className={`relative p-3 rounded-lg border transition-all ${
                        isConstruction 
                          ? 'opacity-50 cursor-not-allowed border-slate-200 bg-slate-50'
                          : formData.category_id === cat.id 
                            ? 'border-indigo-600 bg-indigo-50 shadow-sm cursor-pointer' 
                            : 'border-slate-200 bg-white hover:border-slate-300 cursor-pointer'
                      }`}
                    >
                      {isConstruction && (
                        <div className="absolute top-2 right-2 text-[10px] uppercase font-bold tracking-wide bg-slate-200 text-slate-500 px-2 py-0.5 rounded">
                          Coming soon
                        </div>
                      )}
                      <div className="font-medium text-slate-900">{cat.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {categoryDescriptions[cat.slug] || cat.description}
                      </div>
                    </div>
                  )})}
                </div>
              </div>

              {showSubcategories && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Vehicle type *</label>
                  <div className="flex flex-wrap gap-2">
                    {subcategories.map((sub: any) => (
                      <button
                        key={sub.slug}
                        type="button"
                        onClick={() => handleFieldChange({ subcategory: sub.slug })}
                        className={`px-3 py-1.5 border rounded-full text-sm transition-colors ${
                          formData.subcategory === sub.slug
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                  {!formData.subcategory && (
                    <p className="text-red-500 text-[11px] font-medium mt-2">
                      Please select a vehicle type to continue.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-3">Primary use *</label>
                <div className="flex flex-wrap gap-2">
                  {['personal', 'commercial', 'both'].map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleFieldChange({ use_type: type as any })}
                      className={`flex-1 sm:flex-none px-6 py-2 rounded-full text-sm font-medium border transition-all capitalize ${formData.use_type === type ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
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
                    <label className="block text-sm font-medium text-slate-700 mb-1 opacity-100 flex items-center h-[20px]">Discontinued on (Date)</label>
                    <input 
                        type="date"
                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        value={formData.year_to ? `${formData.year_to}-12-31` : ''}
                        onChange={e => {
                            const val = e.target.value || null;
                            const year = val ? new Date(val).getFullYear() : null;
                            handleFieldChange({ 
                                year_to: year,
                                is_active: !year
                            });
                        }}
                    />
                    </div>
                </div>
                <p className="text-[11px] font-medium text-slate-500 mt-1">Leave blank if this model is still currently available. Stored as year in database.</p>
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

          {isEdit && (
            <Card className="p-6">
              <div className="flex justify-between items-center border-b pb-2 mb-6">
                  <h2 className="text-lg font-semibold text-slate-900">Variants Dashboard</h2>
                  <Button size="sm" type="button" className="whitespace-nowrap flex items-center gap-1.5" onClick={() => navigate(`/admin/catalog/variants/new?model_id=${modelId}`)}>
                      <Plus className="w-3.5 h-3.5" /> Add Variant
                  </Button>
              </div>
              <div className="space-y-2">
                  {!variants || variants.length === 0 ? (
                      <div className="text-sm text-slate-500 py-4 text-center border rounded-md border-dashed border-slate-200">
                          No variants defined for this model yet.
                      </div>
                  ) : (
                      variants.map((v: any) => (
                          <div 
                              key={v.id} 
                              onClick={() => navigate(`/admin/catalog/variants/${v.id}/edit`)}
                              className="flex items-center justify-between p-3 rounded-md bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-sm cursor-pointer transition-all group"
                          >
                              <div className="flex flex-col">
                                  <span className="text-sm font-medium text-slate-900">{v.name}</span>
                                  <span className="text-xs text-slate-500">{v.powertrain?.display_label}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                  <Badge variant={v.status === 'active' ? 'success' : v.status === 'draft' ? 'neutral' : 'error'} className="text-[10px] px-2 py-0.5">
                                      {v.status}
                                  </Badge>
                                  <ExternalLink className="w-4 h-4 text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                              </div>
                          </div>
                      ))
                  )}
              </div>
            </Card>
          )}

          <div className="h-20" /> {/* Spacer for sticky footer */}

          {/* Sticky Bottom Bar */}
          <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/80 backdrop-blur-md border-t border-slate-200 py-4 px-6 lg:px-8 z-50">
            <div className="max-w-7xl mx-auto flex justify-center items-center gap-3 w-full">
              <Button type="button" variant="secondary" onClick={() => navigate('/admin/catalog')}>
                  <X className="w-4 h-4" />
                  Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                <Save className="w-4 h-4" />
                {mutation.isPending ? 'Saving...' : 'Save model'}
              </Button>
            </div>
          </div>
        </form>
      </div>

      <Modal isOpen={showSuccessModal} onClose={() => {}} title="Vehicle Saved">
        <div className="py-2 text-center">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6" />
            </div>
            <p className="text-slate-500 mb-6 font-medium">Model details have been saved successfully.</p>
            <Button className="w-full" onClick={() => navigate('/admin/catalog')}>
                Go back to Models and Variants
            </Button>
        </div>
      </Modal>

      {/* Navigation Blocker Confirmation */}
      <ConfirmDialog
        isOpen={shouldShowDialog}
        onClose={handleCancelNavigation}
        onConfirm={handleConfirmNavigation}
        title="Unsaved Changes"
        message="You have unsaved changes in this model form. Are you sure you want to leave this page? Your changes will be lost."
        confirmLabel="Discard and Leave"
        confirmVariant="destructive"
      />

      {/* Save Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Model Update"
      >
        <div className="py-4">
            <div className="flex items-center gap-3 p-3 bg-indigo-50 text-indigo-800 rounded-lg border border-indigo-200 mb-6 text-sm">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-indigo-500" />
                <p>Are you sure you want to update this model card? This will change the details for all associated variants and historical records.</p>
            </div>
            
            <div className="flex justify-end gap-3 pt-6 border-t">
                <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>Review Changes</Button>
                <Button disabled={mutation.isPending} onClick={confirmSave}>
                    {mutation.isPending ? 'Saving...' : 'Confirm and Save'}
                </Button>
            </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}
