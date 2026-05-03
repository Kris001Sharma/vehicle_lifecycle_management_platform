import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getVehicleTypes, getModelsByType, getVariantsByModel, cloneVariant, discontinueVariant, createVehicleType, createVehicleModel } from '@/lib/db/catalog';
import { useAuthStore } from '@/features/auth/store/authStore';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { Skeleton } from '@/components/ui/Skeleton';
import { Plus, Edit2, Copy, Trash2, ChevronRight, Settings } from 'lucide-react';
import { ComponentErrorBoundary } from '@/components/errors/ComponentErrorBoundary';

function CatalogContent() {
  const { tenantId } = useAuthStore(s => s.user!) || {};
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);

  // Modals
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [newModelDesc, setNewModelDesc] = useState('');

  // Queries
  const { data: types, isLoading: typesLoading } = useQuery({
    queryKey: ['vehicle_types', tenantId],
    queryFn: () => getVehicleTypes(tenantId!),
    enabled: !!tenantId,
  });

  const { data: models, isLoading: modelsLoading } = useQuery({
    queryKey: ['vehicle_models', selectedTypeId, tenantId],
    queryFn: () => getModelsByType(selectedTypeId!, tenantId!),
    enabled: !!tenantId && !!selectedTypeId,
  });

  const { data: variants, isLoading: variantsLoading } = useQuery({
    queryKey: ['vehicle_variants', selectedModelId, tenantId],
    queryFn: () => getVariantsByModel(selectedModelId!, tenantId!),
    enabled: !!tenantId && !!selectedModelId,
  });

  // Mutations
  const createTypeMutation = useMutation({
    mutationFn: (name: string) => createVehicleType({ name }, tenantId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle_types', tenantId] });
      setIsTypeModalOpen(false);
      setNewTypeName('');
      setSelectedTypeId(data.id);
      setSelectedModelId(null);
      showToast('Vehicle type created', 'success');
    },
    onError: (err: any) => showToast(err.message, 'error')
  });

  const createModelMutation = useMutation({
    mutationFn: (data: { name: string, description: string }) => createVehicleModel({ ...data, type_id: selectedTypeId! }, tenantId!),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vehicle_models', selectedTypeId, tenantId] });
      setIsModelModalOpen(false);
      setNewModelName('');
      setNewModelDesc('');
      setSelectedModelId(data.id);
      showToast('Model created', 'success');
    },
    onError: (err: any) => showToast(err.message, 'error')
  });

  const cloneVariantMutation = useMutation({
    mutationFn: (variantId: string) => cloneVariant(variantId, tenantId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle_variants', selectedModelId, tenantId] });
      showToast('Variant cloned successfully', 'success');
    },
    onError: (err: any) => showToast(err.message, 'error')
  });

  const discontinueVariantMutation = useMutation({
    mutationFn: (variantId: string) => discontinueVariant(variantId, tenantId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle_variants', selectedModelId, tenantId] });
      showToast('Variant discontinued', 'success');
    },
    onError: (err: any) => showToast(err.message, 'error')
  });

  return (
    <PageWrapper 
      title="Vehicle Catalog" 
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate('/admin/catalog/features')}>
            <Settings className="w-4 h-4 mr-2" />
            Features
          </Button>
          <Button onClick={() => setIsTypeModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add vehicle type
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)] min-h-[500px]">
        {/* Column 1: Types */}
        <Card title="Vehicle Types" className="flex flex-col h-full overflow-hidden">
          <div className="p-0 overflow-y-auto flex-1">
          {typesLoading ? (
            <div className="p-4 space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
          ) : types?.length === 0 ? (
             <div className="p-8 text-center text-slate-500 text-sm">No vehicle types. Create one to get started.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {types?.map(t => (
                <button
                  key={t.id}
                  onClick={() => { setSelectedTypeId(t.id); setSelectedModelId(null); }}
                  className={`w-full text-left px-4 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${selectedTypeId === t.id ? 'bg-indigo-50/50 border-l-2 border-indigo-500' : 'border-l-2 border-transparent'}`}
                >
                  <span className="font-medium text-slate-900">{t.name}</span>
                  <ChevronRight className={`w-4 h-4 ${selectedTypeId === t.id ? 'text-indigo-500' : 'text-slate-400'}`} />
                </button>
              ))}
            </div>
          )}
          </div>
        </Card>

        {/* Column 2: Models */}
        <Card 
          title="Models" 
          className="flex flex-col h-full overflow-hidden" 
          actions={selectedTypeId && (
            <Button variant="ghost" size="sm" onClick={() => setIsModelModalOpen(true)}>
              <Plus className="w-4 h-4" />
            </Button>
          )}
        >
          <div className="p-0 overflow-y-auto flex-1">
          {!selectedTypeId ? (
            <div className="p-8 text-center text-slate-400 text-sm">Select a vehicle type to view models</div>
          ) : modelsLoading ? (
            <div className="p-4 space-y-3"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
          ) : models?.length === 0 ? (
             <div className="p-8 text-center text-slate-500 text-sm">No models found for this type.</div>
          ) : (
             <div className="divide-y divide-slate-100">
               {models?.map(m => (
                 <button
                   key={m.id}
                   onClick={() => setSelectedModelId(m.id)}
                   className={`w-full text-left px-4 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors ${selectedModelId === m.id ? 'bg-indigo-50/50 border-l-2 border-indigo-500' : 'border-l-2 border-transparent'}`}
                 >
                   <div>
                     <div className="font-medium text-slate-900">{m.name}</div>
                     {m.description && <div className="text-xs text-slate-500 mt-1">{m.description}</div>}
                   </div>
                   <div className="flex items-center gap-3">
                     <Badge variant={m.is_active ? 'success' : 'neutral'}>{m.is_active ? 'Active' : 'Inactive'}</Badge>
                     <ChevronRight className={`w-4 h-4 ${selectedModelId === m.id ? 'text-indigo-500' : 'text-slate-400'}`} />
                   </div>
                 </button>
               ))}
             </div>
          )}
          </div>
        </Card>

        {/* Column 3: Variants */}
        <Card 
          title="Variants" 
          className="flex flex-col h-full overflow-hidden" 
          actions={selectedModelId && (
            <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/catalog/variants/new?model_id=${selectedModelId}`)}>
              <Plus className="w-4 h-4" />
            </Button>
          )}
        >
          <div className="p-0 overflow-y-auto flex-1">
          {!selectedModelId ? (
            <div className="p-8 text-center text-slate-400 text-sm">Select a model to view variants</div>
          ) : variantsLoading ? (
            <div className="p-4 space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
          ) : variants?.length === 0 ? (
             <div className="p-8 text-center text-slate-500 text-sm">No variants found.</div>
          ) : (
             <div className="divide-y divide-slate-100">
               {variants?.map(v => (
                 <div key={v.id} className="p-4 hover:bg-slate-50 transition-colors group">
                   <div className="flex justify-between items-start mb-2">
                     <div className="font-medium text-slate-900">{v.name}</div>
                     <Badge variant={v.status === 'active' ? 'success' : v.status === 'draft' ? 'warning' : 'neutral'}>{v.status}</Badge>
                   </div>
                   <div className="text-xs text-slate-500 mb-3 font-mono">{v.sku || 'No SKU'}</div>
                   
                   <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/catalog/variants/${v.id}/edit`)}>
                       <Edit2 className="w-3 h-3 mr-1" /> Edit
                     </Button>
                     <Button size="sm" variant="secondary" onClick={() => cloneVariantMutation.mutate(v.id)} disabled={cloneVariantMutation.isPending}>
                       <Copy className="w-3 h-3 mr-1" /> Clone
                     </Button>
                     {v.status === 'active' && (
                       <Button size="sm" variant="secondary" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200" onClick={() => discontinueVariantMutation.mutate(v.id)} disabled={discontinueVariantMutation.isPending}>
                         <Trash2 className="w-3 h-3 mr-1" /> Discontinue
                       </Button>
                     )}
                   </div>
                 </div>
               ))}
             </div>
          )}
          </div>
        </Card>
      </div>

      <Modal isOpen={isTypeModalOpen} onClose={() => setIsTypeModalOpen(false)} title="Add Vehicle Type">
        <div className="space-y-4">
          <Input 
            label="Name (e.g. Electric, Diesel)" 
            value={newTypeName} 
            onChange={e => setNewTypeName(e.target.value)} 
            placeholder="Enter type name"
            autoFocus
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsTypeModalOpen(false)}>Cancel</Button>
            <Button onClick={() => createTypeMutation.mutate(newTypeName)} disabled={!newTypeName || createTypeMutation.isPending}>Create</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isModelModalOpen} onClose={() => setIsModelModalOpen(false)} title="Add Vehicle Model">
        <div className="space-y-4">
          <Input 
            label="Model Name" 
            value={newModelName} 
            onChange={e => setNewModelName(e.target.value)} 
            placeholder="e.g. Model S"
            autoFocus
          />
          <Input 
            label="Description (Optional)" 
            value={newModelDesc} 
            onChange={e => setNewModelDesc(e.target.value)} 
          />
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsModelModalOpen(false)}>Cancel</Button>
            <Button onClick={() => createModelMutation.mutate({ name: newModelName, description: newModelDesc })} disabled={!newModelName || createModelMutation.isPending}>Create</Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
}

export function CatalogPage() {
  return (
    <ComponentErrorBoundary componentName="CatalogPage">
      <CatalogContent />
    </ComponentErrorBoundary>
  );
}
