import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/authStore';
import { getTenantCatalogConfig, upsertTenantCatalogConfig } from '@/lib/db/catalogV2';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/hooks/useToast';
import { Save, Info, X, ChevronLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { SEEDED_MANUFACTURERS } from '@/constants/manufacturers';

export function CatalogSettingsPage() {
  const user = useAuthStore(s => s.user);
  const tenantId = user?.tenantId;
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [newManufacturer, setNewManufacturer] = useState('');

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['vehicle_categories'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('vehicle_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: powertrains = [], isLoading: powertrainsLoading } = useQuery({
    queryKey: ['powertrain_types'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('powertrain_types')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['tenant_catalog_config', tenantId],
    queryFn: () => getTenantCatalogConfig(tenantId!),
    enabled: !!tenantId,
  });

  const [formState, setFormState] = useState({
    enabled_category_ids: [] as string[],
    enabled_powertrain_ids: [] as string[],
    manufacturers: [] as string[],
    default_service_interval_km: 10000,
    default_service_interval_months: 6,
    regulatory_market: 'IN',
    currency: 'INR',
    finance_tracking_enabled: false
  });

  useEffect(() => {
    if (config) {
      setFormState({
        enabled_category_ids: config.enabled_category_ids || [],
        enabled_powertrain_ids: config.enabled_powertrain_ids || [],
        manufacturers: config.manufacturers || [],
        default_service_interval_km: config.default_service_interval_km || 10000,
        default_service_interval_months: config.default_service_interval_months || 6,
        regulatory_market: config.regulatory_market || 'IN',
        currency: config.currency || 'INR',
        finance_tracking_enabled: config.finance_tracking_enabled || false
      });
    }
  }, [config]);

  const handleMarketChange = (val: string) => {
    setFormState(prev => {
      let nextCurrency = prev.currency;
      if (val === 'NP') {
        nextCurrency = 'NPR';
      } else if (val === 'IN') {
        nextCurrency = 'INR';
      } else if (val === 'US') {
        nextCurrency = 'USD';
      } else if (val === 'EU') {
        nextCurrency = 'EUR';
      }
      return { ...prev, regulatory_market: val, currency: nextCurrency };
    });
  };

  const mutation = useMutation({
    mutationFn: (data: typeof formState) => upsertTenantCatalogConfig(tenantId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant_catalog_config', tenantId] });
      showToast('Catalog settings saved successfully', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to save settings', 'error');
    }
  });

  const toggleCategory = (id: string) => {
    setFormState(prev => {
      const next = prev.enabled_category_ids.includes(id)
        ? prev.enabled_category_ids.filter(i => i !== id)
        : [...prev.enabled_category_ids, id];
      return { ...prev, enabled_category_ids: next };
    });
  };

  const togglePowertrain = (id: string) => {
    setFormState(prev => {
      const next = prev.enabled_powertrain_ids.includes(id)
        ? prev.enabled_powertrain_ids.filter(i => i !== id)
        : [...prev.enabled_powertrain_ids, id];
      return { ...prev, enabled_powertrain_ids: next };
    });
  };

  const addManufacturer = () => {
      if (!newManufacturer.trim()) return;
      if (formState.manufacturers.includes(newManufacturer.trim())) {
          showToast('Manufacturer already exists', 'error');
          return;
      }
      setFormState(prev => ({
          ...prev,
          manufacturers: [...prev.manufacturers, newManufacturer.trim()]
      }));
      setNewManufacturer('');
  };

  const removeManufacturer = (name: string) => {
      setFormState(prev => ({
          ...prev,
          manufacturers: prev.manufacturers.filter(m => m !== name)
      }));
  };

  if (configLoading || categoriesLoading || powertrainsLoading) {
      return (
          <PageWrapper title="Catalog Settings">
              <div className="animate-pulse space-y-6">
                  <div className="h-64 bg-slate-200 rounded-lg" />
                  <div className="h-64 bg-slate-200 rounded-lg" />
              </div>
          </PageWrapper>
      );
  }

  return (
    <PageWrapper 
      title="Catalog Settings"
      actions={
        <Button variant="secondary" onClick={() => navigate('/admin')} className="h-9">
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </Button>
      }
    >
      <div className="space-y-8 pb-20">
        {/* Section 1: Categories */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Vehicle Categories</h2>
            <p className="text-sm text-slate-500">Select the vehicle categories your dealership handles. Leave all unselected to enable all categories.</p>
          </div>
          
          {formState.enabled_category_ids.length === 0 && (
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center gap-3 text-sm text-indigo-700">
              <Info className="w-4 h-4 flex-shrink-0" />
              All categories are currently enabled. Toggle specific categories to restrict the catalog.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories?.map(cat => (
              <Card key={cat.id} className={`p-4 border-2 transition-all cursor-pointer ${formState.enabled_category_ids.includes(cat.id) ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-100'}`} onClick={() => toggleCategory(cat.id)}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-slate-900">{cat.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{cat.description}</p>
                  </div>
                  <Switch 
                    checked={formState.enabled_category_ids.includes(cat.id)} 
                    onChange={() => toggleCategory(cat.id)}
                    className="mt-1"
                  />
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Section 2: Powertrains */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Powertrain Types</h2>
            <p className="text-sm text-slate-500">Select the fuel types your dealership handles. Leave all unselected to enable all types.</p>
          </div>

          {formState.enabled_powertrain_ids.length === 0 && (
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center gap-3 text-sm text-indigo-700">
              <Info className="w-4 h-4 flex-shrink-0" />
              All powertrain types are currently enabled.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {powertrains?.map(pt => (
              <Card key={pt.id} className={`p-4 border-2 transition-all cursor-pointer ${formState.enabled_powertrain_ids.includes(pt.id) ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-100'}`} onClick={() => togglePowertrain(pt.id)}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-slate-900">{pt.display_label}</h3>
                    <p className="text-xs text-slate-500 mt-1">{pt.description}</p>
                  </div>
                  <Switch 
                    checked={formState.enabled_powertrain_ids.includes(pt.id)} 
                    onChange={() => togglePowertrain(pt.id)}
                    className="mt-1"
                  />
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Section 3: Manufacturers */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Supported Manufacturers</h2>
              <p className="text-sm text-slate-500">Add the manufacturers your dealership handles. These will appear in the model creation form.</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-6">
            <div className="flex gap-2 mb-6">
                <div className="flex-1">
                    <Input 
                        placeholder="Enter manufacturer name (e.g. Tata, Mahindra)"
                        value={newManufacturer}
                        onChange={e => setNewManufacturer(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addManufacturer())}
                        list="seeded-manufacturers"
                    />
                    <datalist id="seeded-manufacturers">
                        {SEEDED_MANUFACTURERS.map(m => (
                            <option key={m} value={m} />
                        ))}
                    </datalist>
                </div>
                <Button variant="secondary" className="h-10" onClick={addManufacturer}>Add</Button>
            </div>

            <div className="flex flex-wrap gap-2">
                {formState.manufacturers.length === 0 ? (
                    <div className="text-sm text-slate-400 italic py-2">No manufacturers added yet. Add one above.</div>
                ) : (
                    formState.manufacturers.map((m: string) => (
                        <div key={m} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium group hover:bg-slate-200 transition-colors">
                            {m}
                            <button 
                                onClick={() => removeManufacturer(m)}
                                className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))
                )}
            </div>
          </div>
        </section>

        {/* Section 4: Defaults */}
        <section className="bg-white p-6 rounded-lg border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Defaults</h2>
            <p className="text-sm text-slate-500 mb-6">Default service schedule applied to new variants.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input 
                    label="Default Service Interval (km)"
                    type="number"
                    value={formState.default_service_interval_km}
                    onChange={e => setFormState(prev => ({ ...prev, default_service_interval_km: parseInt(e.target.value) }))}
                />
                <Input 
                    label="Default Service Interval (months)"
                    type="number"
                    value={formState.default_service_interval_months}
                    onChange={e => setFormState(prev => ({ ...prev, default_service_interval_months: parseInt(e.target.value) }))}
                />
            </div>
        </section>

        {/* Section 4: Market */}
        <section className="bg-white p-6 rounded-lg border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Market Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Regulatory Market</label>
                    <select 
                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        value={formState.regulatory_market}
                        onChange={e => handleMarketChange(e.target.value)}
                    >
                        <option value="IN">India</option>
                        <option value="NP">Nepal</option>
                        <option value="EU">European Union</option>
                        <option value="US">United States</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                    <select 
                        className="w-full h-10 px-3 bg-white border border-slate-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                        value={formState.currency}
                        onChange={e => setFormState(prev => ({ ...prev, currency: e.target.value }))}
                    >
                        <option value="INR">INR (₹)</option>
                        <option value="NPR">NPR (रू)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="AED">AED (د.إ)</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            </div>
        </section>

        {/* Section 5: Finance & deposit tracking */}
        <section className="bg-white p-6 rounded-lg border border-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 mb-1">Finance & deposit tracking</h2>
                <p className="text-sm text-slate-500">Enable this to record deposit amounts, finance types, and loan details on pre-bookings and sales. When disabled, all finance fields are hidden across the application.</p>
              </div>
              <Switch 
                checked={(formState as any).finance_tracking_enabled || false}
                onChange={() => setFormState(prev => ({ ...prev, finance_tracking_enabled: !(prev as any).finance_tracking_enabled }))}
                className="mt-1"
              />
            </div>
        </section>

        <div className="flex justify-end gap-3 p-6 bg-slate-50 border-t border-slate-200 rounded-b-lg -mx-0">
          <Button variant="secondary" onClick={() => window.history.back()}>Cancel</Button>
          <Button disabled={mutation.isPending} onClick={() => mutation.mutate(formState)}>
            <Save className="w-4 h-4" />
            {mutation.isPending ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </PageWrapper>
  );
}
