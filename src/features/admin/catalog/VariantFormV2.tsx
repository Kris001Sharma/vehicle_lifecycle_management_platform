import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEnabledPowertrainTypes, createVariant, updateVariant, getVariantWithDetails, createFeature, getFeaturesByType, getTenantCatalogConfig } from '@/lib/db/catalogV2';
import { getSpecFields } from '@/lib/catalog/specSchemas';
import { useAuthStore } from '@/features/auth/store/authStore';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { ArrowLeft, Save, Plus, Check, X, AlertTriangle } from 'lucide-react';
import { useFormDirtyNavigation } from '@/hooks/useFormDirtyNavigation';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { supabase } from '@/lib/supabase/client';
import { Modal } from '@/components/ui/Modal';

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
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [pendingSaveStatus, setPendingSaveStatus] = useState<string | null>(null);
  const [newFeature, setNewFeature] = useState({ name: '', category: 'comfort' });
  const [newColor, setNewColor] = useState({ hex: '#FFFFFF', name: '' });

  const DEFAULT_COLORS = [
    { hex: '#FFFFFF', name: 'White' },
    { hex: '#000000', name: 'Black' },
    { hex: '#FF0000', name: 'Red' },
    { hex: '#FFFF00', name: 'Yellow' },
    { hex: '#0000FF', name: 'Blue' },
    { hex: '#808080', name: 'Grey' },
  ];

  const { data: config } = useQuery({
    queryKey: ['tenant_catalog_config', tenantId],
    queryFn: () => getTenantCatalogConfig(tenantId!),
    enabled: !!tenantId,
  });

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
         const targetId = modelId || variantInit?.model_id;
         if (!targetId) return null;
         const { data, error } = await (supabase as any)
            .from('vehicle_models')
            .select('*, category:vehicle_categories(*)')
            .eq('id', targetId)
            .single();
         if (error) throw error;
         return data;
     },
     enabled: !!(modelId || variantInit?.model_id) && !!tenantId
  });
  
  const categorySlug = currentModel?.category?.slug || '';
  const subcategorySlug = currentModel?.subcategory || null;

  // Get field definitions
  const specFields = useMemo(() => 
    selectedPowertrain ? getSpecFields(categorySlug, subcategorySlug, selectedPowertrain.slug) : [],
    [categorySlug, subcategorySlug, selectedPowertrain]
  );

  // Form setup
  const { register, handleSubmit, watch, setValue, formState: { isDirty: rhfIsDirty } } = useForm({
    defaultValues: {
      name: '',
      sku: '',
      status: 'draft',
      availability_status: 'ACTIVE',
      launched_at: '', // Launch year as string for input
      warranty_vehicle_yrs: 0,
      warranty_powertrain_yrs: 0,
      warranty_battery_yrs: 0,
      service_interval_km: 10000,
      service_interval_months: 6,
      price: 0,
      specs: {} as Record<string, any>
    }
  });

  const [initialFeatures, setInitialFeatures] = useState<string>('{}');
  const [initialPowertrainId, setInitialPowertrainId] = useState<string | null>(null);

  useEffect(() => {
    if (variantInit) {
      setValue('name', variantInit.name);
      setValue('sku', variantInit.sku || '');
      setValue('status', variantInit.status);
      setValue('availability_status', variantInit.availability_status || 'ACTIVE');
      setValue('launched_at', variantInit.launched_at || '');
      setValue('warranty_vehicle_yrs', variantInit.warranty_vehicle_yrs || 0);
      setValue('warranty_powertrain_yrs', variantInit.warranty_powertrain_yrs || 0);
      setValue('warranty_battery_yrs', variantInit.warranty_battery_yrs || 0);
      setValue('service_interval_km', variantInit.service_interval_km || 10000);
      setValue('service_interval_months', variantInit.service_interval_months || 6);
      setValue('price', variantInit.price || 0);
      setValue('specs', variantInit.specs || {});
      setSelectedPowertrainId(variantInit.powertrain_type_id);
      setInitialPowertrainId(variantInit.powertrain_type_id);

      const featureMap: Record<string, 'standard' | 'optional' | 'none'> = {};
      variantInit.features?.forEach((f: any) => {
          featureMap[f.id] = f.is_standard ? 'standard' : 'optional';
      });
      setSelectedFeatures(featureMap);
      setInitialFeatures(JSON.stringify(featureMap));
    } else if (currentModel) {
      // Pre-fill manufacturer and year for new variants
      if (currentModel.manufacturer) setValue('specs.manufacturer', currentModel.manufacturer);
      if (currentModel.year_from) setValue('specs.model_year', currentModel.year_from);
    }
  }, [variantInit, currentModel, setValue]);

  const featuresChanged = useMemo(() => JSON.stringify(selectedFeatures) !== initialFeatures, [selectedFeatures, initialFeatures]);
  const powertrainChanged = selectedPowertrainId !== initialPowertrainId;
  const isActuallyDirty = rhfIsDirty || featuresChanged || powertrainChanged;

  const { shouldShowDialog, handleConfirmNavigation, handleCancelNavigation, resetBlocker } = useFormDirtyNavigation(isActuallyDirty);

  const { data: features } = useQuery({
      queryKey: ['features', tenantId],
      queryFn: () => getFeaturesByType(null, tenantId!),
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
            model_id: modelId || variantInit?.model_id
        };

        return isEdit 
            ? updateVariant(variantId!, savePayload, featuresToSave, tenantId!)
            : createVariant(savePayload, featuresToSave, tenantId!);
    },
    onSuccess: () => {
        resetBlocker();
        showToast(`Variant ${isEdit ? 'updated' : 'created'} successfully`, 'success');
        queryClient.invalidateQueries({ queryKey: ['all_vehicle_variants'] });
        queryClient.invalidateQueries({ queryKey: ['vehicle_models'] });
        setIsConfirmModalOpen(false);
        navigate('/admin/catalog');
    },
    onError: (err: any) => {
        showToast(err.message, 'error');
        setIsConfirmModalOpen(false);
    }
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
          
          if (isEdit) {
              setPendingSaveStatus(statusOverride || null);
              setIsConfirmModalOpen(true);
          } else {
              mutation.mutate(data);
          }
      })();
  };

  const confirmSave = () => {
      handleSubmit(data => {
          if (pendingSaveStatus) {
              data.status = pendingSaveStatus;
          }
          mutation.mutate(data);
      })();
  };

  const handleCreateFeature = async () => {
    if (!newFeature.name.trim()) return;
    try {
        const feat = await createFeature(
            { 
                name: newFeature.name, 
                category: newFeature.category,
                vehicle_type_id: currentModel?.category_id || null
            }, 
            tenantId!
        );
        showToast('Feature created', 'success');
        queryClient.invalidateQueries({ queryKey: ['features'] });
        setIsFeatureModalOpen(false);
        setNewFeature({ name: '', category: 'comfort' });
        // Automatically set it as optional for now
        setSelectedFeatures(prev => ({ ...prev, [feat.id]: 'optional' }));
    } catch (err: any) {
        showToast(err.message, 'error');
    }
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

  const specHeadingPrefix = currentModel?.subcategory ? 
      (currentModel.category?.subcategories?.find((s: any) => s.slug === currentModel.subcategory)?.label || currentModel.category?.name)
      : currentModel?.category?.name;

  return (
    <PageWrapper 
      title={isEdit ? "Edit Variant" : "Add Variant"}
      backLink={{ label: 'Catalog', path: '/admin/catalog' }}
    >
      <div className="space-y-8 pb-32">
        <Card className="p-6">
          <div className="flex justify-between items-start mb-6 border-b pb-4">
            <div>
                <label className="block text-sm font-medium text-slate-500 mb-1 leading-none uppercase tracking-wider text-[10px]">Model & Manufacturer</label>
                <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-slate-900">{currentModel?.manufacturer || '...'}</span>
                    <span className="text-xl font-medium text-slate-500">{currentModel?.name || '...'}</span>
                </div>
            </div>
            <div className="text-right">
                <h2 className="text-lg font-semibold text-slate-900 leading-tight">Variant Identity</h2>
                <p className="text-xs text-slate-500">Global identity and launch status</p>
            </div>
          </div>

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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Availability</label>
              <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
                {[
                  { id: 'ACTIVE', label: 'Active' },
                  { id: 'PRE_ORDER_ONLY', label: 'Pre-order Only' },
                  { id: 'DISCONTINUED', label: 'Discontinued' }
                ].map(avail => (
                  <button
                    key={avail.id}
                    type="button"
                    onClick={() => setValue('availability_status', avail.id)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${watch('availability_status') === avail.id ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    {avail.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">Launch Date</label>
                <input 
                    type="date"
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    {...register('launched_at')}
                />
            </div>
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

        {/* Pricing Section */}
        <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 border-b pb-2 mb-6">Pricing</h2>
            <div className="max-w-xs">
                <label className="block text-sm font-medium text-slate-700 mb-1">Variant Price ({config?.currency || 'INR'}) *</label>
                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                        {config?.currency === 'USD' ? '$' : 
                         config?.currency === 'EUR' ? '€' : 
                         config?.currency === 'GBP' ? '£' : 
                         config?.currency === 'INR' ? '₹' : 
                         config?.currency === 'NPR' ? 'रू' : ''}
                    </div>
                    <input 
                        type="number" 
                        step="0.01"
                        className="w-full h-10 pl-10 pr-3 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
                        {...register('price', { valueAsNumber: true, required: true, min: 0 })}
                    />
                </div>
                <p className="text-[10px] text-slate-500 mt-2 italic">Ex-showroom price for this variant.</p>
            </div>
        </Card>

        {/* Section C & D & E: Dynamic Specs */}
        {selectedPowertrainId && (
          <div className="space-y-8">
            <Card className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6 border-b pb-2">
                    {specHeadingPrefix ? `${specHeadingPrefix} specifications` : `Specifications: ${selectedPowertrain?.display_label}`}
                </h2>
                <div className="space-y-8">
                    {Object.entries(groupedFields).map(([group, fields]) => (
                        <div key={group}>
                            <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-4">{group}</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {fields.map(field => {
                                    if (field.key === 'colour_options') {
                                        return (
                                            <div key={field.key} className="md:col-span-2 lg:col-span-2 space-y-3">
                                                <label className="block text-sm font-medium text-slate-700">Colour Options</label>
                                                <div className="flex flex-wrap gap-4 items-center">
                                                    {(watch('specs.colour_options') || []).map((color: any, idx: number) => (
                                                        <div key={idx} className="group relative" title={color.name}>
                                                            <div 
                                                                className="w-10 h-10 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.1)] cursor-pointer transition-transform hover:scale-110 active:scale-95"
                                                                style={{ backgroundColor: color.hex }}
                                                            />
                                                            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded pointer-events-none z-10">
                                                                {color.name}
                                                            </div>
                                                            <button 
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = watch('specs.colour_options') || [];
                                                                    setValue('specs.colour_options', current.filter((_: any, i: number) => i !== idx));
                                                                }}
                                                                className="absolute -top-1 -right-1 bg-white rounded-full shadow-md p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                                                            >
                                                                <X className="w-3 h-3 text-red-500" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button 
                                                        type="button"
                                                        onClick={() => setIsColorModalOpen(true)}
                                                        className="w-10 h-10 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition-all bg-slate-50/50"
                                                        title="Add color option"
                                                    >
                                                        <Plus className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
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
                                    );
                                })}
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
        <div className="space-y-6 pb-20">
            {/* Standard Features */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Standard Included Features</h2>
                        <p className="text-[11px] text-slate-500 font-medium">ALWAYS INCLUDED IN SALE</p>
                    </div>
                    <Badge variant="success" className="text-[10px] uppercase bg-green-50 text-green-700 border-green-200">Standard</Badge>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {features?.filter((f: any) => selectedFeatures[f.id] === 'standard').map((f: any) => (
                            <div 
                                key={f.id} 
                                onClick={() => toggleFeature(f.id, 'standard')}
                                className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                                <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-slate-900">{f.name}</div>
                                    <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">{f.category}</div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFeature(f.id, 'standard');
                                    }}
                                    className="ml-auto text-slate-300 hover:text-red-500 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                        {features?.filter((f: any) => selectedFeatures[f.id] === 'standard').length === 0 && (
                            <div className="col-span-full border-2 border-dashed border-slate-100 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                                <Plus className="w-8 h-8 text-slate-200 mb-2" />
                                <p className="text-xs text-slate-400 font-medium italic">No standard features selected. Move features here from the list below.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Optional Features */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Optional Add-on Features</h2>
                        <p className="text-[11px] text-slate-500 font-medium uppercase">Selectable per sale</p>
                    </div>
                    <Badge variant="neutral" className="text-[10px] uppercase bg-amber-50 text-amber-700 border-amber-200">Optional</Badge>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        {features?.map((f: any) => (
                            <div 
                                key={f.id} 
                                onClick={() => toggleFeature(f.id, selectedFeatures[f.id] === 'standard' ? 'standard' : 'optional')}
                                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                                    selectedFeatures[f.id] === 'optional' 
                                        ? 'bg-amber-50/50 border-amber-200 ring-1 ring-amber-200' 
                                        : selectedFeatures[f.id] === 'standard'
                                        ? 'bg-slate-50 border-slate-200 opacity-60'
                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                                    selectedFeatures[f.id] === 'optional' 
                                        ? 'bg-amber-600 border-amber-600' 
                                        : selectedFeatures[f.id] === 'standard'
                                        ? 'bg-indigo-600 border-indigo-600'
                                        : 'bg-white border-slate-300 shadow-sm'
                                }`}>
                                    {(selectedFeatures[f.id] === 'optional' || selectedFeatures[f.id] === 'standard') && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <div className="flex-1">
                                    <div className="text-sm font-semibold text-slate-900">{f.name}</div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{f.category}</div>
                                        {selectedFeatures[f.id] === 'standard' && (
                                            <span className="text-[9px] font-bold text-indigo-500 uppercase px-1.5 py-0.5 bg-indigo-50 rounded">Set as Standard</span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex gap-1">
                                    {selectedFeatures[f.id] !== 'standard' && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleFeature(f.id, 'standard'); }}
                                            className="p-1 text-slate-400 hover:text-indigo-600 transition-colors"
                                            title="Move to Standard"
                                        >
                                            <ArrowLeft className="w-3.5 h-3.5 rotate-90" />
                                        </button>
                                    )}
                                    {selectedFeatures[f.id] === 'standard' && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleFeature(f.id, 'optional'); }}
                                            className="p-1 text-slate-400 hover:text-amber-600 transition-colors"
                                            title="Set as Optional"
                                        >
                                            <ArrowLeft className="w-3.5 h-3.5 -rotate-90" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-fit text-xs text-slate-500 hover:text-indigo-600 border-slate-200 border border-dashed" 
                        onClick={() => setIsFeatureModalOpen(true)}
                    >
                        <Plus className="w-3 h-3 mr-1" /> Add custom feature
                    </Button>
                </div>
            </div>
        </div>

        {/* Feature Modal */}
        <Modal 
            isOpen={isFeatureModalOpen} 
            onClose={() => setIsFeatureModalOpen(false)}
            title="Add Custom Feature"
            footer={(
                <div className="flex justify-end gap-3 w-full">
                    <Button variant="secondary" onClick={() => setIsFeatureModalOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateFeature}>Create Feature</Button>
                </div>
            )}
        >
            <div className="space-y-4 pt-4">
                <Input 
                    label="Feature Name"
                    placeholder="e.g. Adaptive Cruise Control"
                    value={newFeature.name}
                    onChange={e => setNewFeature(prev => ({ ...prev, name: e.target.value }))}
                />
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    <select 
                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        value={newFeature.category}
                        onChange={e => setNewFeature(prev => ({ ...prev, category: e.target.value }))}
                    >
                        <option value="comfort">Comfort</option>
                        <option value="safety">Safety</option>
                        <option value="tech">Technology</option>
                        <option value="interior">Interior</option>
                        <option value="exterior">Exterior</option>
                        <option value="performance">Performance</option>
                    </select>
                </div>
            </div>
        </Modal>

        {/* Color Palette Modal */}
        <Modal
            isOpen={isColorModalOpen}
            onClose={() => setIsColorModalOpen(false)}
            title="Add Color Option"
            footer={(
                <div className="flex justify-end gap-3 w-full">
                    <Button variant="secondary" onClick={() => setIsColorModalOpen(false)}>Cancel</Button>
                    <Button onClick={() => {
                        const current = watch('specs.colour_options') || [];
                        setValue('specs.colour_options', [...current, newColor]);
                        setIsColorModalOpen(false);
                        setNewColor({ hex: '#FFFFFF', name: '' });
                    }}>Add to Variant</Button>
                </div>
            )}
        >
            <div className="space-y-6 pt-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">Select a base shade</label>
                    <div className="grid grid-cols-6 gap-3">
                        {DEFAULT_COLORS.map((c) => (
                            <button
                                key={c.hex}
                                type="button"
                                onClick={() => setNewColor({ hex: c.hex, name: c.name })}
                                className={`w-full aspect-square rounded-lg border-2 transition-all ${newColor.hex === c.hex ? 'border-indigo-600 ring-2 ring-indigo-100 scale-110' : 'border-slate-100 hover:border-slate-200'}`}
                                style={{ backgroundColor: c.hex }}
                                title={c.name}
                            />
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase">Hex Code</label>
                        <div className="flex gap-2">
                            <div 
                                className="w-10 h-10 rounded border border-slate-200 flex-shrink-0"
                                style={{ backgroundColor: newColor.hex }}
                            />
                            <Input 
                                value={newColor.hex}
                                onChange={e => setNewColor(prev => ({ ...prev, hex: e.target.value }))}
                                placeholder="#000000"
                                className="h-10"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400 uppercase">Custom Name</label>
                        <Input 
                            value={newColor.name}
                            onChange={e => setNewColor(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="e.g. Glossy White"
                            className="h-10"
                        />
                    </div>
                </div>
            </div>
        </Modal>

        {/* Sticky Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/80 backdrop-blur-md border-t border-slate-200 py-4 px-6 lg:px-8 z-50">
            <div className="max-w-7xl mx-auto flex justify-center items-center gap-3 w-full">
                <Button variant="secondary" className="whitespace-nowrap" disabled={mutation.isPending} onClick={() => onSave('draft')}>
                    <Check className="w-4 h-4" />
                    Save as Draft
                </Button>
                <Button className="whitespace-nowrap" disabled={mutation.isPending} onClick={() => onSave('active')}>
                    <Save className="w-4 h-4" />
                    {mutation.isPending ? 'Saving...' : 'Save and Activate'}
                </Button>
            </div>
        </div>

        {/* Save Confirmation Modal */}
        <Modal
            isOpen={isConfirmModalOpen}
            onClose={() => setIsConfirmModalOpen(false)}
            title="Confirm Changes"
        >
            <div className="py-4">
                <div className="flex items-center gap-3 p-3 bg-indigo-50 text-indigo-800 rounded-lg border border-indigo-200 mb-6 text-sm">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 text-indigo-500" />
                    <p>Are you sure you want to update this variant? Double check the specifications to ensure accuracy before saving.</p>
                </div>
                
                <div className="flex justify-end gap-3 pt-6 border-t">
                    <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>Review Changes</Button>
                    <Button disabled={mutation.isPending} onClick={confirmSave}>
                        {mutation.isPending ? 'Saving...' : 'Confirm and Save'}
                    </Button>
                </div>
            </div>
        </Modal>

        {/* Navigation Blocker Dialog */}
        <ConfirmDialog
          isOpen={shouldShowDialog}
          onClose={handleCancelNavigation}
          onConfirm={handleConfirmNavigation}
          title="Unsaved Changes"
          message="You have unsaved changes in this variant form. Navigating away will cause you to lose all edited information. Are you sure you want to discard changes?"
          confirmLabel="Discard and Leave"
          confirmVariant="destructive"
        />
      </div>
    </PageWrapper>
  );
}
