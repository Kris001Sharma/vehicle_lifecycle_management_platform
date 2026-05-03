import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFeaturesByType, createFeature, updateFeature, getVehicleTypes } from '@/lib/db/catalog';
import { useAuthStore } from '@/features/auth/store/authStore';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/hooks/useToast';
import { Plus, Edit2, Save, X } from 'lucide-react';
import { ComponentErrorBoundary } from '@/components/errors/ComponentErrorBoundary';
import { useFormDirtyBlocker } from '@/hooks/useFormDirtyBlocker';

function FeatureContent() {
  const { tenantId } = useAuthStore(s => s.user!) || {};
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    vehicle_type_id: '',
    is_default_standard: false,
  });

  useFormDirtyBlocker(isCreating || editingId !== null);

  const { data: features, isLoading } = useQuery({
    queryKey: ['features', null, tenantId],
    queryFn: () => getFeaturesByType(null, tenantId!),
    enabled: !!tenantId,
  });

  const { data: types } = useQuery({
    queryKey: ['vehicle_types', tenantId],
    queryFn: () => getVehicleTypes(tenantId!),
    enabled: !!tenantId,
  });

  const createMutation = useMutation({
    mutationFn: () => createFeature({ ...formData, vehicle_type_id: formData.vehicle_type_id || null }, tenantId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features', null, tenantId] });
      setIsCreating(false);
      resetForm();
      showToast('Feature created', 'success');
    },
    onError: (err: any) => showToast(err.message, 'error')
  });

  const updateMutation = useMutation({
    mutationFn: () => updateFeature(editingId!, { ...formData, vehicle_type_id: formData.vehicle_type_id || null }, tenantId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['features', null, tenantId] });
      setEditingId(null);
      resetForm();
      showToast('Feature updated', 'success');
    },
    onError: (err: any) => showToast(err.message, 'error')
  });

  const resetForm = () => {
    setFormData({ name: '', category: '', vehicle_type_id: '', is_default_standard: false });
  };

  const handleEdit = (f: any) => {
    setFormData({
      name: f.name,
      category: f.category,
      vehicle_type_id: f.vehicle_type_id || '',
      is_default_standard: f.is_default_standard,
    });
    setEditingId(f.id);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    resetForm();
  };

  const handleSave = () => {
    if (!formData.name || !formData.category) {
      showToast('Name and category are required', 'warning');
      return;
    }
    if (isCreating) createMutation.mutate();
    if (editingId) updateMutation.mutate();
  };

  return (
    <PageWrapper 
      title="Feature Library"
      actions={
        <Button onClick={() => { setIsCreating(true); setEditingId(null); resetForm(); }} disabled={isCreating || editingId !== null}>
          <Plus className="w-4 h-4 mr-2" /> Add Feature
        </Button>
      }
    >
      <Card>
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="px-4 py-3">Feature Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Applies To</th>
                  <th className="px-4 py-3">Default Standard</th>
                  <th className="px-4 py-3 w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isCreating && (
                  <tr className="bg-indigo-50/30">
                    <td className="px-4 py-2"><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Air Conditioning" /></td>
                    <td className="px-4 py-2"><Input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="e.g. Comfort" /></td>
                    <td className="px-4 py-2">
                      <select className="w-full text-sm border-slate-200 rounded-md shadow-sm h-10 px-3" value={formData.vehicle_type_id} onChange={e => setFormData({...formData, vehicle_type_id: e.target.value})}>
                        <option value="">All Types (Global)</option>
                        {types?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input type="checkbox" checked={formData.is_default_standard} onChange={e => setFormData({...formData, is_default_standard: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded" />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={handleSave} disabled={createMutation.isPending}><Save className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={handleCancel}><X className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                )}
                
                {features?.map((f: any) => editingId === f.id ? (
                  <tr key={f.id} className="bg-indigo-50/30">
                    <td className="px-4 py-2"><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></td>
                    <td className="px-4 py-2"><Input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} /></td>
                    <td className="px-4 py-2">
                      <select className="w-full text-sm border-slate-200 rounded-md shadow-sm h-10 px-3" value={formData.vehicle_type_id} onChange={e => setFormData({...formData, vehicle_type_id: e.target.value})}>
                        <option value="">All Types (Global)</option>
                        {types?.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <input type="checkbox" checked={formData.is_default_standard} onChange={e => setFormData({...formData, is_default_standard: e.target.checked})} className="w-4 h-4 text-indigo-600 rounded" />
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={handleSave} disabled={updateMutation.isPending}><Save className="w-4 h-4" /></Button>
                        <Button size="sm" variant="ghost" onClick={handleCancel}><X className="w-4 h-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{f.name}</td>
                    <td className="px-4 py-3 text-slate-600">{f.category}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {f.vehicle_type_id ? types?.find(t => t.id === f.vehicle_type_id)?.name || 'Unknown' : <Badge variant="neutral">Global</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      {f.is_default_standard ? <Badge variant="success">Yes</Badge> : <Badge variant="neutral">No</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(f)} disabled={isCreating || editingId !== null}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                
                {features?.length === 0 && !isCreating && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">No features found. Create your first feature.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}

export function FeaturePage() {
  return (
    <ComponentErrorBoundary componentName="FeaturePage">
      <FeatureContent />
    </ComponentErrorBoundary>
  );
}
