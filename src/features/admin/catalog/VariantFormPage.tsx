import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { variantSchema } from '@/lib/validations/catalog';
import { getVariantWithFeatures, createVariant, updateVariant, getFeaturesByType, getVehicleTypes, createFeature } from '@/lib/db/catalog';
import { useAuthStore } from '@/features/auth/store/authStore';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { ComponentErrorBoundary } from '@/components/errors/ComponentErrorBoundary';
import { useFormDirtyBlocker } from '@/hooks/useFormDirtyBlocker';
import { ArrowLeft, Save, Plus } from 'lucide-react';

function VariantFormContent() {
  const { variantId } = useParams();
  const [searchParams] = useSearchParams();
  const modelId = searchParams.get('model_id');
  const navigate = useNavigate();
  const { tenantId } = useAuthStore(s => s.user!) || {};
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const isEdit = Boolean(variantId);

  const { data: variantInit, isLoading: variantLoading } = useQuery({
    queryKey: ['variant', variantId, tenantId],
    queryFn: () => getVariantWithFeatures(variantId!, tenantId!),
    enabled: !!variantId && !!tenantId,
  });

  const [resolvedModelId, setResolvedModelId] = useState<string | null>(modelId);

  useEffect(() => {
    if (variantInit) {
      setResolvedModelId(variantInit.model_id);
    }
  }, [variantInit]);

  const { data: types } = useQuery({
    queryKey: ['vehicle_types', tenantId],
    queryFn: () => getVehicleTypes(tenantId!),
    enabled: !!tenantId,
  });

  // Since we don't know the type ID directly from the variant (it's on the model),
  // we either need to fetch the model or we can fetch all models for all types to find the model's type.
  // Actually, we can just fetch models for each type until we find it, or if we have a small DB, it's fine.
  // Let's assume we can fetch all models or we just don't have an endpoint for GET /model/:id.
  // We can fetch types, then find the type that matches the model. Wait, getModelsByType requires typeId!
  // Since we don't have getModelById, let's just do a manual query directly or extend DB functions.
  
  // Actually, I can add a getModelById to the db file later, or I'll just write it here.
  const { data: currentModel } = useQuery({
    queryKey: ['model', resolvedModelId, tenantId],
    queryFn: async () => {
      const { supabase } = await import('@/lib/supabase/client');
      const { data, error } = await (supabase as any).from('vehicle_models').select('*').eq('id', resolvedModelId!).single();
      if (error) throw error;
      return data as any;
    },
    enabled: !!resolvedModelId,
  });

  const typeSlug = types && currentModel ? types.find(t => t.id === currentModel.type_id)?.slug : null;

  const { data: features } = useQuery({
    queryKey: ['features', currentModel?.type_id, tenantId],
    queryFn: () => getFeaturesByType(currentModel?.type_id!, tenantId!),
    enabled: !!currentModel?.type_id && !!tenantId,
  });

  const { register, handleSubmit, watch, formState: { errors, isDirty }, reset, setValue } = useForm({
    resolver: zodResolver(variantSchema),
    defaultValues: {
      name: '',
      sku: '',
      status: 'draft',
      launched_at: '',
      service_interval_km: 0,
      service_interval_months: 0,
      warranty_vehicle_yrs: 0,
      warranty_battery_yrs: 0,
      warranty_motor_yrs: 0,
      vehicle_type_slug: '',
      specs: {}
    } as any
  });

  useFormDirtyBlocker(isDirty);

  // Initialize form
  useEffect(() => {
    if (isEdit && variantInit && typeSlug) {
      reset({
        name: variantInit.name,
        sku: variantInit.sku || '',
        status: variantInit.status,
        launched_at: variantInit.launched_at || '',
        service_interval_km: variantInit.service_interval_km || 0,
        service_interval_months: variantInit.service_interval_months || 0,
        warranty_vehicle_yrs: variantInit.warranty_vehicle_yrs || 0,
        warranty_battery_yrs: variantInit.warranty_battery_yrs || 0,
        warranty_motor_yrs: variantInit.warranty_motor_yrs || 0,
        vehicle_type_slug: typeSlug,
        specs: (variantInit.specs as any) || {}
      });
      // Set features
      const selectedMap: Record<string, boolean> = {};
      variantInit.features?.forEach((f: any) => {
        selectedMap[f.feature.id] = f.is_standard;
      });
      setSelectedFeatures(selectedMap);
    } else if (!isEdit && typeSlug) {
      setValue('vehicle_type_slug', typeSlug);
    }
  }, [isEdit, variantInit, typeSlug, reset, setValue]);

  const [selectedFeatures, setSelectedFeatures] = useState<Record<string, boolean>>({});

  // Auto-select standard features from library on new
  useEffect(() => {
    if (!isEdit && features && Object.keys(selectedFeatures).length === 0) {
      const initial: Record<string, boolean> = {};
      features.forEach(f => {
        if (f.is_default_standard) {
          initial[f.id] = true;
        }
      });
      setSelectedFeatures(initial);
    }
  }, [features, isEdit, selectedFeatures]);

  const createMutation = useMutation({
    mutationFn: (data: any) => {
      const featuresToSave = Object.keys(selectedFeatures).map(id => ({
        feature_id: id,
        is_standard: selectedFeatures[id]
      }));
      return createVariant({
        model_id: resolvedModelId!,
        name: data.name,
        sku: data.sku || null,
        status: data.status,
        service_interval_km: data.service_interval_km || null,
        service_interval_months: data.service_interval_months || null,
        warranty_vehicle_yrs: data.warranty_vehicle_yrs || null,
        warranty_battery_yrs: data.warranty_battery_yrs || null,
        warranty_motor_yrs: data.warranty_motor_yrs || null,
        launched_at: data.launched_at || null,
        specs: data.specs,
      }, featuresToSave, tenantId!);
    },
    onSuccess: () => {
      showToast('Variant created', 'success');
      navigate('/admin/catalog');
    },
    onError: (err: any) => showToast(err.message, 'error')
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => {
      const featuresToSave = Object.keys(selectedFeatures).map(id => ({
        feature_id: id,
        is_standard: selectedFeatures[id]
      }));
      return updateVariant(variantId!, {
        name: data.name,
        sku: data.sku || null,
        status: data.status,
        service_interval_km: data.service_interval_km || null,
        service_interval_months: data.service_interval_months || null,
        warranty_vehicle_yrs: data.warranty_vehicle_yrs || null,
        warranty_battery_yrs: data.warranty_battery_yrs || null,
        warranty_motor_yrs: data.warranty_motor_yrs || null,
        launched_at: data.launched_at || null,
        specs: data.specs,
      }, featuresToSave, tenantId!);
    },
    onSuccess: () => {
      showToast('Variant updated', 'success');
      reset(watch()); // Reset dirty state
      navigate('/admin/catalog');
    },
    onError: (err: any) => showToast(err.message, 'error')
  });

  const onSubmit = (data: any) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const handleFeatureToggle = (featureId: string, checked: boolean, isStandardSelected: boolean) => {
    setSelectedFeatures(prev => {
      const next = { ...prev };
      if (!checked) {
        delete next[featureId];
      } else {
        next[featureId] = isStandardSelected;
      }
      return next;
    });
  };

  const [newFeatureName, setNewFeatureName] = useState('');
  const createFeatureMutation = useMutation({
    mutationFn: (name: string) => createFeature({ name, category: 'Custom', vehicle_type_id: currentModel?.type_id, is_default_standard: false }, tenantId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['features', currentModel?.type_id, tenantId] });
      setNewFeatureName('');
      handleFeatureToggle(data.id, true, false); // Add as optional by default
      showToast('Feature added', 'success');
    },
    onError: (err: any) => showToast(err.message, 'error')
  });

  if (isEdit && variantLoading) {
    return <div className="p-8 text-center">Loading variant data...</div>;
  }

  if (!resolvedModelId && !isEdit) {
    return <div className="p-8 text-center">Error: Model ID missing.</div>;
  }

  if (!typeSlug) {
    return <div className="p-8 text-center text-slate-500">Determining vehicle type...</div>;
  }

  return (
    <PageWrapper 
      title={isEdit ? "Edit Variant" : "Create Variant"}
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl pb-24">
        
        {/* Section 1: Identity */}
        <Card title="Variant Identity">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Variant Name" {...register('name')} error={errors.name?.message as string} />
            <Input label="SKU / Internal ID" {...register('sku')} error={errors.sku?.message as string} />
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-900 block">Status</label>
              <select {...register('status')} className="w-full text-sm border-slate-200 rounded-md shadow-sm h-10 px-3">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </div>
            <Input type="date" label="Launch Date" {...register('launched_at')} error={errors.launched_at?.message as string} />
          </div>
        </Card>

        {/* Section 2: Specs */}
        <Card title={`Vehicle Specifications (${typeSlug.toUpperCase()})`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {typeSlug === 'electric' && (
              <>
                <Input type="number" step="0.1" label="Motor Power (kW)" {...register('specs.motor_kw', { valueAsNumber: true })} error={(errors.specs as any)?.motor_kw?.message} />
                <Input type="number" step="0.1" label="Battery Capacity (kWh)" {...register('specs.battery_kwh', { valueAsNumber: true })} error={(errors.specs as any)?.battery_kwh?.message} />
                <Input type="number" step="1" label="Range (km)" {...register('specs.range_km', { valueAsNumber: true })} error={(errors.specs as any)?.range_km?.message} />
                
                <Input type="number" step="0.1" label="AC Charge Time (hrs)" {...register('specs.charge_time_ac_hrs', { valueAsNumber: true })} error={(errors.specs as any)?.charge_time_ac_hrs?.message} />
                <Input type="number" step="1" label="DC Charge Time (mins)" {...register('specs.charge_time_dc_mins', { valueAsNumber: true })} error={(errors.specs as any)?.charge_time_dc_mins?.message} />
                <Input type="number" step="1" label="Seating Capacity" {...register('specs.seating_capacity', { valueAsNumber: true })} error={(errors.specs as any)?.seating_capacity?.message} />
                
                <Input type="number" step="1" label="Max Payload (kg)" {...register('specs.max_payload_kg', { valueAsNumber: true })} error={(errors.specs as any)?.max_payload_kg?.message} />
                <Input type="number" step="1" label="GVW (kg)" {...register('specs.gvw_kg', { valueAsNumber: true })} error={(errors.specs as any)?.gvw_kg?.message} />
                <Input type="number" step="1" label="Wheelbase (mm)" {...register('specs.wheelbase_mm', { valueAsNumber: true })} error={(errors.specs as any)?.wheelbase_mm?.message} />
              </>
            )}
            
            {typeSlug === 'diesel' && (
              <>
                <Input type="number" step="1" label="Engine (cc)" {...register('specs.engine_cc', { valueAsNumber: true })} error={(errors.specs as any)?.engine_cc?.message} />
                <Input type="number" step="0.1" label="Horsepower" {...register('specs.horsepower', { valueAsNumber: true })} error={(errors.specs as any)?.horsepower?.message} />
                <Input type="number" step="1" label="Torque (Nm)" {...register('specs.torque_nm', { valueAsNumber: true })} error={(errors.specs as any)?.torque_nm?.message} />
                
                <Input type="number" step="1" label="Fuel Tank (Litres)" {...register('specs.fuel_tank_litres', { valueAsNumber: true })} error={(errors.specs as any)?.fuel_tank_litres?.message} />
                <Input type="number" step="1" label="Seating Capacity" {...register('specs.seating_capacity', { valueAsNumber: true })} error={(errors.specs as any)?.seating_capacity?.message} />
                <Input label="Emission Standard" {...register('specs.emission_standard')} error={(errors.specs as any)?.emission_standard?.message} />
                
                <Input type="number" step="1" label="Max Payload (kg)" {...register('specs.max_payload_kg', { valueAsNumber: true })} error={(errors.specs as any)?.max_payload_kg?.message} />
                <Input type="number" step="1" label="GVW (kg)" {...register('specs.gvw_kg', { valueAsNumber: true })} error={(errors.specs as any)?.gvw_kg?.message} />
                <Input type="number" step="1" label="Wheelbase (mm)" {...register('specs.wheelbase_mm', { valueAsNumber: true })} error={(errors.specs as any)?.wheelbase_mm?.message} />
              </>
            )}
          </div>
        </Card>

        {/* Section 3: Warranty */}
        <Card title="Warranty">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input type="number" step="1" label="Vehicle Warranty (Years)" {...register('warranty_vehicle_yrs', { valueAsNumber: true })} error={errors.warranty_vehicle_yrs?.message as string} />
            {typeSlug === 'electric' && (
              <>
                <Input type="number" step="1" label="Battery Warranty (Years)" {...register('warranty_battery_yrs', { valueAsNumber: true })} error={errors.warranty_battery_yrs?.message as string} />
                <Input type="number" step="1" label="Motor Warranty (Years)" {...register('warranty_motor_yrs', { valueAsNumber: true })} error={errors.warranty_motor_yrs?.message as string} />
              </>
            )}
          </div>
        </Card>

        {/* Section 4: Service Schedule */}
        <Card title="Service Schedule">
          <div className="text-sm text-slate-500 mb-4 pb-2 border-b border-slate-100">
            Service is due at whichever threshold is reached first.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input type="number" step="100" label="Service Interval (km)" {...register('service_interval_km', { valueAsNumber: true })} error={errors.service_interval_km?.message as string} />
            <Input type="number" step="1" label="Service Interval (Months)" {...register('service_interval_months', { valueAsNumber: true })} error={errors.service_interval_months?.message as string} />
          </div>
        </Card>

        {/* Section 5 & 6: Features */}
        <Card title="Features Setup">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
               <h4 className="font-semibold text-slate-800 mb-3 border-b pb-2">Standard Features</h4>
               <div className="space-y-2">
                 {features?.filter(f => f.is_default_standard).map(f => (
                   <div key={f.id} className="flex items-center gap-3">
                     <input 
                       type="checkbox" 
                       id={`std-${f.id}`} 
                       className="w-4 h-4 text-indigo-600 rounded"
                       checked={selectedFeatures[f.id] !== undefined && selectedFeatures[f.id] === true}
                       onChange={(e) => handleFeatureToggle(f.id, e.target.checked, true)}
                     />
                     <label htmlFor={`std-${f.id}`} className="text-sm text-slate-700 select-none cursor-pointer">{f.name} <span className="text-xs text-slate-400">({f.category})</span></label>
                   </div>
                 ))}
                 {features?.filter(f => f.is_default_standard).length === 0 && <span className="text-sm text-slate-400">No standard features defined in library</span>}
               </div>
            </div>
            
            <div>
               <h4 className="font-semibold text-slate-800 mb-3 border-b pb-2">Optional Features</h4>
               <div className="space-y-2">
                 {features?.filter(f => !f.is_default_standard).map(f => (
                   <div key={f.id} className="flex items-center gap-3">
                     <input 
                       type="checkbox" 
                       id={`opt-${f.id}`} 
                       className="w-4 h-4 text-indigo-600 rounded"
                       checked={selectedFeatures[f.id] !== undefined && selectedFeatures[f.id] === false}
                       onChange={(e) => handleFeatureToggle(f.id, e.target.checked, false)}
                     />
                     <label htmlFor={`opt-${f.id}`} className="text-sm text-slate-700 select-none cursor-pointer">{f.name} <span className="text-xs text-slate-400">({f.category})</span></label>
                   </div>
                 ))}
                 {features?.filter(f => !f.is_default_standard).length === 0 && <span className="text-sm text-slate-400">No optional features defined in library</span>}
               </div>
            </div>
          </div>
          
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center gap-3">
            <div className="mb-0 flex-1 max-w-xs">
              <Input 
                placeholder="New feature name..." 
                value={newFeatureName} 
                onChange={e => setNewFeatureName(e.target.value)} 
                className="mb-0"
              />
            </div>
            <Button 
                type="button" 
                variant="secondary" 
                onClick={() => createFeatureMutation.mutate(newFeatureName)}
                disabled={!newFeatureName || createFeatureMutation.isPending}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Custom Feature
            </Button>
          </div>
        </Card>

        {/* Submit Float */}
        <div className="fixed bottom-0 left-0 right-0 md:left-64 lg:left-64 bg-white/80 backdrop-blur-md border-t p-4 flex justify-end gap-3 z-40">
           <Button type="button" variant="secondary" onClick={() => navigate('/admin/catalog')}>Cancel</Button>
           <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
             <Save className="w-4 h-4 mr-2" />
             {isEdit ? 'Save Changes' : 'Create Variant'}
           </Button>
        </div>

      </form>
    </PageWrapper>
  );
}

export function VariantFormPage() {
  return (
    <ComponentErrorBoundary componentName="VariantFormPage">
      <VariantFormContent />
    </ComponentErrorBoundary>
  );
}
