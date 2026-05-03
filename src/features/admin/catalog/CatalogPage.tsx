import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getModelsWithCategory } from '@/lib/db/catalogV2';
import { useAuthStore } from '@/features/auth/store/authStore';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Plus, Edit2, Search, ChevronDown, ChevronUp, Car } from 'lucide-react';
import { ComponentErrorBoundary } from '@/components/errors/ComponentErrorBoundary';
import { supabase } from '@/lib/supabase/client';

function CatalogContent() {
  const { tenantId } = useAuthStore(s => s.user!) || {};
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  // Queries
  const { data: models = [], isLoading } = useQuery({
    queryKey: ['vehicle_models', tenantId],
    queryFn: () => getModelsWithCategory(tenantId!),
    enabled: !!tenantId,
  });

  const { data: variants = [] } = useQuery({
      queryKey: ['all_vehicle_variants', tenantId],
      queryFn: async () => {
          const { data, error } = await (supabase as any).from('vehicle_variants').select('*, powertrain:powertrain_types(*)').eq('tenant_id', tenantId);
          if (error) throw error;
          return data;
      },
      enabled: !!tenantId
  });

  const filteredModels = useMemo(() => {
    return models.filter(m => 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      m.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [models, searchQuery]);

  const modelsByCategory = filteredModels.reduce((acc: Record<string, any[]>, model: any) => {
    const categoryName = model.category?.name || 'Uncategorized';
    if (!acc[categoryName]) acc[categoryName] = [];
    acc[categoryName].push(model);
    return acc;
  }, {} as Record<string, any[]>);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => ({ ...prev, [categoryName]: !prev[categoryName] }));
  };

  if (isLoading) {
      return (
          <PageWrapper title="Vehicle Catalog">
              <div className="space-y-6">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-64 w-full" />
              </div>
          </PageWrapper>
      )
  }

  const noModelsExist = models.length === 0;
  const noSearchResults = !noModelsExist && filteredModels.length === 0;

  return (
    <PageWrapper 
      title="Vehicle Catalog" 
      actions={
        <div className="flex gap-2">
          <Button onClick={() => navigate('/admin/catalog/models/new')}>
            <Plus className="w-4 h-4" /> Add model
          </Button>
        </div>
      }
    >
      <div className="max-w-6xl space-y-8">
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Search by manufacturer or model name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {noModelsExist && (
            <div className="py-20 flex flex-col items-center text-center">
                <Car className="w-12 h-12 text-slate-300 mb-4" />
                <h3 className="text-slate-900 font-bold text-xl">No models yet</h3>
                <p className="text-slate-500 mt-2 max-w-sm mb-6">Start by adding your first vehicle model. Each model can have multiple variants with different specifications.</p>
                <Button onClick={() => navigate('/admin/catalog/models/new')}>
                    <Plus className="w-4 h-4" /> Add your first model
                </Button>
            </div>
        )}

        {noSearchResults && (
            <div className="py-20 flex flex-col items-center text-center">
                <h3 className="text-slate-900 font-bold text-xl">No models match your search</h3>
                <p className="text-slate-500 mt-2">Try a different manufacturer or model name.</p>
            </div>
        )}

        {/* Categories Grouped View */}
        {!noModelsExist && !noSearchResults && (
          <div className="space-y-4 pb-20">
            {Object.entries(modelsByCategory).map(([categoryName, catModels]) => {
              const isExpanded = expandedCategories[categoryName] !== false; // Default expanded
              return (
                <div key={categoryName} className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                  <button 
                    onClick={() => toggleCategory(categoryName)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition-colors border-b border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <h2 className="font-medium text-slate-500 text-sm uppercase tracking-wide">{categoryName}</h2>
                      <Badge variant="neutral" className="bg-slate-200 text-slate-600">{catModels.length}</Badge>
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </button>
                  
                  {isExpanded && (
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {catModels.map((model: any) => {
                            const modelVariants = variants.filter((v: any) => v.model_id === model.id);
                            const powertrainsList = Array.from(new Set(modelVariants.map((v: any) => v.powertrain?.display_label).filter(Boolean)));
                            
                            const useTypeClass = {
                                personal: 'bg-blue-50 text-blue-700',
                                commercial: 'bg-amber-50 text-amber-700',
                                both: 'bg-green-50 text-green-700'
                            }[model.use_type as 'personal' | 'commercial' | 'both'] || 'bg-slate-50 text-slate-700';

                            return (
                                <div key={model.id} className="bg-white border border-slate-200 rounded-lg p-4 group flex flex-col hover:border-slate-300 transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="text-base font-semibold text-slate-900">
                                                {model.manufacturer} {model.name}
                                            </h3>
                                        </div>
                                        <div className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${useTypeClass}`}>
                                            {model.use_type}
                                        </div>
                                    </div>

                                    <div className="flex-1">
                                        {modelVariants.length === 0 ? (
                                            <div className="bg-amber-50 rounded p-2 text-xs text-amber-700 border border-amber-100/50 mb-3">
                                                No variants — this model cannot be used in sales until a variant is added.
                                            </div>
                                        ) : (
                                            <div className="space-y-3 mb-3">
                                                <div className="text-sm text-slate-500">
                                                    {modelVariants.length} variant{modelVariants.length === 1 ? '' : 's'}
                                                </div>
                                                {powertrainsList.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {powertrainsList.map((pt: any) => (
                                                            <span key={pt} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                                                                {pt}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end gap-2 items-center">
                                        <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/catalog/variants/new?model_id=${model.id}`)}>
                                            <Plus className="w-3 h-3" /> Add variant
                                        </Button>
                                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/catalog/models/${model.id}/edit`)}>
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
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

