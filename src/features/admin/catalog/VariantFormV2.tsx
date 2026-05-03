import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEnabledPowertrainTypes, createVariant, updateVariant, getVariantWithDetails } from '@/lib/db/catalogV2';
import { getSpecFields } from '@/lib/catalog/specSchemas';
import { useAuthStore } from '@/features/auth/store/authStore';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';

export function VariantFormV2() {
  const { variantId } = useParams();
  const [searchParams] = useSearchParams();
  const modelId = searchParams.get('model_id');
  const isEdit = !!variantId;
  const navigate = useNavigate();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);
  const tenantId = user?.tenantId;

  const [selectedPowertrainId, setSelectedPowertrainId] = useState<string | null>(null);
  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, 'standard' | 'optional' | 'none'>>({});

  const { data: variantInit, isLoading: variantLoading } = useQuery({
    queryKey: ['variant', variantId, tenantId],
    queryFn: () => getVariantWithDetails(variantId!, tenantId!),
    enabled: !!variantId && !!tenantId,
  });

  const { data: powertrains } = useQuery({
    queryKey: ['enabled_powertrains', tenantId],
    queryFn: () => getEnabledPowertrainTypes(tenantId!),
    enabled: !!tenantId,
  });

  const selectedPowertrain = useMemo(() => 
    powertrains?.find(p => p.id === selectedPowertrainId),
    [powertrains, selectedPowertrainId]
  );

  // For create mode, we need to fetch the model's category slug
  const { data: currentModel } = useQuery({
     queryKey: ['model', modelId || variantInit?.model_id, tenantId],
     queryFn: async () => {
         const { data, error } = await (supabase as any).from('vehicle_models').select('*, category:vehicle_categories(*)').eq('id', modelId || variantId).single();
         if (error) throw error;
         return data;
     },
     enabled: !!(modelId || (isEdit && !!variantInit)) && !!tenantId
  });
  
  const categorySlug = currentModel?.category?.slug || '';

  // Get field definitions
  const specFields = useMemo(() => 
    selectedPowertrain ? getSpecFields(categorySlug, selectedPowertrain.slug) : [],
    [categorySlug, selectedPowertrain]
  );

  // Form setup
  const { register, handleSubmit, watch, setValue, formState: { } } = useForm({
    defaultValues: {
      name: '',
      sku: '',
      status: 'draft',
      launched_at: '', // Launch year as string for input
      warranty_vehicle_yrs: 0,
      warranty_powertrain_yrs: 0,
      warranty_battery_yrs: 0,
      service_interval_km: 10000,
      service_interval_months: 6,
      specs: {} as Record<string, any>
    }
  });

  useEffect(() => {
    if (variantInit) {
      setValue('name', variantInit.name);
      setValue('sku', variantInit.sku || '');
      setValue('status', variantInit.status);
      setValue('launched_at', variantInit.launched_at || '');
      setValue('warranty_vehicle_yrs', variantInit.warranty_vehicle_yrs || 0);
      setValue('warranty_powertrain_yrs', variantInit.warranty_powertrain_yrs || 0);
      setValue('warranty_battery_yrs', variantInit.warranty_battery_yrs || 0);
      setValue('service_interval_km', variantInit.service_interval_km || 10000);
      setValue('service_interval_months', variantInit.service_interval_months || 6);
      setValue('specs', variantInit.specs || {});
      setSelectedPowertrainId(variantInit.powertrain_type_id);

      const featureMap: Record<string, 'standard' | 'optional' | 'none'> = {};
      variantInit.features?.forEach((f: any) => {
          featureMap[f.id] = f.is_standard ? 'standard' : 'optional';
      });
      setSelectedFeatures(featureMap);
    }
  }, [variantInit, setValue]);

  const { data: features } = useQuery({
      queryKey: ['features', tenantId],
      queryFn: async () => {
          const { data, error } = await (supabase as any).from('features').select('*').eq('tenant_id', tenantId);
          if (error) throw error;
          return data;
      },
      enabled: !!tenantId
  });

  const mutation = useMutation({
    mutationFn: (data: any) => {
        const featuresToSave = Object.entries(selectedFeatures)
            .filter(([_, status]) => status !== 'none')
            .map(([id, status]) => ({ feature_id: id, is_standard: status === 'standard' }));
        
        const savePayload = {
            ...data,
            powertrain_type_id: selectedPowertrainId,
            model_id: modelId || variantInit.model_id
        };

        return isEdit 
            ? updateVariant(variantId!, savePayload, featuresToSave, tenantId!)
            : createVariant(savePayload, featuresToSave, tenantId!);
    },
    onSuccess: () => {
        showToast(`Variant ${isEdit ? 'updated' : 'created'} successfully`, 'success');
        queryClient.invalidateQueries({ queryKey: ['vehicle_variants'] });
        navigate('/admin/catalog');
    },
    onError: (err: any) => showToast(err.message, 'error')
  });

  const onSave = (statusOverride?: string) => {
      handleSubmit(data => {
          if (!selectedPowertrainId) {
              showToast('Please select a powertrain type', 'error');
              return;
          }
          if (statusOverride) {
              data.status = statusOverride;
          }
          mutation.mutate(data);
      })();
  };

  if (isEdit && variantLoading) {
      return <PageWrapper title="Edit Variant">Loading...</PageWrapper>;
  }

  const groupedFields = specFields.reduce((acc, field) => {
      if (!acc[field.group]) acc[field.group] = [];
      acc[field.group].push(field);
      return acc;
  }, {} as Record<string, typeof specFields>);

  const toggleFeature = (id: string, type: 'standard' | 'optional') => {
      setSelectedFeatures(prev => {
          const current = prev[id];
          if (current === type) return { ...prev, [id]: 'none' };
          return { ...prev, [id]: type };
      });
  };

  return (
    <PageWrapper 
      title={isEdit ? "Edit Variant" : "Add Variant"}
      actions={
        <Button variant="secondary" onClick={() => navigate('/admin/catalog')}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>
      }
    >
      <div className="max-w-4xl space-y-8 pb-32">
        {/* Section A: Identity */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-slate-900 border-b pb-2">Variant Identity</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input 
              label="Variant Name *"
              placeholder="e.g. LX 150kWh Long Range"
              {...register('name', { required: true })}
            />
            <Input 
              label="Internal SKU / Code"
              {...register('sku')}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
                {['draft', 'active', 'discontinued'].map(status => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setValue('status', status)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${watch('status') === status ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
            <Input 
              label="Launch Year"
              type="number"
              {...register('launched_at')}
            />
          </div>
        </Card>

        {/* Section B: Powertrain Selection */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900">Powertrain Type</h2>
          <p className="text-sm text-slate-500 mb-6">Select the type of powertrain for this variant. This determines which specifications are required.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {powertrains?.map(pt => (
              <div 
                key={pt.id}
                onClick={() => setSelectedPowertrainId(pt.id)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPowertrainId === pt.id ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'}`}
              >
                <div className="font-bold text-slate-900 text-base">{pt.display_label}</div>
                <div className="text-xs text-slate-500 mt-1 line-clamp-2">{pt.description}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Section C & D & E: Dynamic Specs */}
        {selectedPowertrainId && (
          <div className="space-y-8">
            <Card className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6 border-b pb-2">Specifications: {selectedPowertrain?.display_label}</h2>
                <div className="space-y-8">
                    {Object.entries(groupedFields).map(([group, fields]) => (
                        <div key={group}>
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4">{group}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {fields.map(field => (
                                    <div key={field.key} className={field.key === 'description' ? 'md:col-span-2 lg:col-span-4' : ''}>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            {field.label} {field.required && '*'}
                                        </label>
                                        
                                        {field.type === 'number' && (
                                            <div className="relative">
                                                <input 
                                                    type="number"
                                                    className="w-full h-10 pl-3 pr-12 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                    {...register(`specs.${field.key}`, { valueAsNumber: true })}
                                                />
                                                {field.unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">{field.unit}</span>}
                                            </div>
                                        )}
                                        
                                        {field.type === 'text' && (
                                            <input 
                                                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                {...register(`specs.${field.key}`)}
                                            />
                                        )}

                                        {field.type === 'boolean' && (
                                            <Switch 
                                                checked={watch(`specs.${field.key}`)}
                                                onChange={(val: boolean) => setValue(`specs.${field.key}`, val)}
                                            />
                                        )}

                                        {field.type === 'select' && (
                                            <select 
                                                className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                                                {...register(`specs.${field.key}`)}
                                            >
                                                <option value="">Select...</option>
                                                {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                            </select>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
          </div>
        )}

        {/* Section F: Warranty & Service */}
        <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2 mb-6">Warranty & Service</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Warranty (Years)</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-slate-600">Vehicle Warranty</span>
                            <input type="number" className="w-20 h-9 px-2 border border-slate-200 rounded text-sm text-right" {...register('warranty_vehicle_yrs', { valueAsNumber: true })} />
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-slate-600">Powertrain Warranty</span>
                            <input type="number" className="w-20 h-9 px-2 border border-slate-200 rounded text-sm text-right" {...register('warranty_powertrain_yrs', { valueAsNumber: true })} />
                        </div>
                        {(selectedPowertrain?.slug === 'electric' || selectedPowertrain?.slug.includes('hybrid')) && (
                             <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-slate-600">Battery Warranty</span>
                                <input type="number" className="w-20 h-9 px-2 border border-slate-200 rounded text-sm text-right" {...register('warranty_battery_yrs', { valueAsNumber: true })} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Service Schedule</h3>
                    <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Interval (km)</label>
                                <div className="relative">
                                    <input type="number" className="w-full h-10 pl-3 pr-10 border border-slate-200 rounded-md text-sm" {...register('service_interval_km', { valueAsNumber: true })} />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold uppercase">km</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Interval (months)</label>
                                <div className="relative">
                                    <input type="number" className="w-full h-10 pl-3 pr-16 border border-slate-200 rounded-md text-sm" {...register('service_interval_months', { valueAsNumber: true })} />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold uppercase">months</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-3 leading-tight italic">Service is due at whichever threshold is reached first.</p>
                    </div>
                </div>
            </div>
        </Card>

        {/* Section G & H: Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
            <Card className="p-6">
                <h2 className="text-lg font-semibold text-slate-900">Standard Features</h2>
                <p className="text-xs text-slate-500 mb-6">Included in every vehicle of this variant.</p>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {features?.map((f: any) => (
                        <div key={f.id} className="flex items-center gap-3">
                            <input 
                                type="checkbox" 
                                checked={selectedFeatures[f.id] === 'standard'}
                                onChange={() => toggleFeature(f.id, 'standard')}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-slate-700">{f.name}</span>
                            <Badge variant="neutral" className="text-[10px] ml-auto uppercase">{f.category}</Badge>
                        </div>
                    ))}
                </div>
            </Card>

            <Card className="p-6">
                <h2 className="text-lg font-semibold text-slate-900">Optional Add-ons</h2>
                <p className="text-xs text-slate-500 mb-6">Available for purchase during sale.</p>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                    {features?.map((f: any) => (
                        <div key={f.id} className="flex items-center gap-3">
                            <input 
                                type="checkbox" 
                                checked={selectedFeatures[f.id] === 'optional'}
                                onChange={() => toggleFeature(f.id, 'optional')}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-slate-700">{f.name}</span>
                            <Badge variant="neutral" className="text-[10px] ml-auto uppercase">{f.category}</Badge>
                        </div>
                    ))}
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-4 text-xs text-slate-500 hover:text-indigo-600" onClick={() => navigate('/admin/catalog/features')}>
                    <Plus className="w-3 h-3 mr-1" /> Add custom feature
                </Button>
            </Card>
        </div>

        {/* Sticky Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 z-50">
            <div className="max-w-4xl mx-auto flex justify-between items-center px-4">
                <Button variant="secondary" onClick={() => navigate('/admin/catalog')}>Discard Changes</Button>
                <div className="flex gap-3">
                    <Button variant="secondary" disabled={mutation.isPending} onClick={() => onSave('draft')}>
                        Save as Draft
                    </Button>
                    <Button disabled={mutation.isPending} onClick={() => onSave('active')}>
                        <Save className="w-4 h-4 mr-2" />
                        {mutation.isPending ? 'Saving...' : 'Save and Activate'}
                    </Button>
                </div>
            </div>
        </div>
      </div>
    </PageWrapper>
  );
}
