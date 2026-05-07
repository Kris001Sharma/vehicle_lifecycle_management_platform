import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/authStore';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { Save, Trophy, Plus, Trash2, Award, Target, TrendingUp, Zap } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/utils/cn';

export function AchievementSettingsPage() {
  const user = useAuthStore(s => s.user);
  const tenantId = user?.tenantId;
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [milestones, setMilestones] = useState<any[]>([]);
  const [quote, setQuote] = useState('');

  const { data: configData, isLoading: configLoading } = useQuery({
    queryKey: ['achievement_config', tenantId],
    queryFn: async () => {
      const [milestoneRes, configRes] = await Promise.all([
        (supabase as any).from('achievement_milestones').select('*').eq('tenant_id', tenantId).order('order_index', { ascending: true }),
        (supabase as any).from('tenant_achievement_config').select('*').eq('tenant_id', tenantId).maybeSingle()
      ]);

      return { 
        milestones: milestoneRes.data || [], 
        config: configRes.data || null 
      };
    },
    enabled: !!tenantId,
  });

  // Since we want to update state when data changes (e.g. after save or initial load)
  const [hasInitialized, setHasInitialized] = useState(false);
  if (configData && !hasInitialized && !configLoading) {
    setMilestones(configData.milestones);
    setQuote(configData.config?.quote || '');
    setHasInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error('Tenant ID not found');

      // 1. Upsert Config (Quote)
      const { error: configError } = await (supabase as any)
        .from('tenant_achievement_config')
        .upsert({ 
          tenant_id: tenantId, 
          quote 
        }, { onConflict: 'tenant_id' });

      if (configError) throw configError;

      // 2. Handle milestones: To ensure the DB matches exactly the UI list, 
      // we'll handle upsert for items with IDs and insert for items without IDs.
      // But wait - if we want to replace the list (especially after Reset),
      // we need to know which ones were deleted.
      // Easiest is to delete all for this tenant and re-insert, but that changes IDs.
      // Better: keep track of what changed.
      
      const toUpsert = milestones.map((m, i) => {
        const cleaned = { ...m };
        cleaned.tenant_id = tenantId;
        cleaned.order_index = i;
        // Ensure id is only there if it's meant to be an update
        if (!cleaned.id) delete cleaned.id;
        return cleaned;
      });

      if (toUpsert.length > 0) {
        // We still need to handle deleted items that aren't in this list anymore
        // Actually the simplest is to fetch existing IDs and delete those not in toUpsert
        const { data: existing } = await (supabase as any)
          .from('achievement_milestones')
          .select('id')
          .eq('tenant_id', tenantId);
        
        const currentIds = toUpsert.map((m: any) => m.id).filter(Boolean);
        const toDeleteIds = existing?.map((m: any) => m.id).filter((id: string) => !currentIds.includes(id)) || [];

        if (toDeleteIds.length > 0) {
          await (supabase as any).from('achievement_milestones').delete().in('id', toDeleteIds);
        }

        const { error: milestoneError } = await (supabase as any)
          .from('achievement_milestones')
          .upsert(toUpsert);
          
        if (milestoneError) throw milestoneError;
      } else {
        // If list is empty, delete all for tenant
        await (supabase as any).from('achievement_milestones').delete().eq('tenant_id', tenantId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievement_config', tenantId] });
      setHasInitialized(false); // Refreshes state from fresh data
      showToast('Achievement settings saved successfully', 'success');
    },
    onError: (err: any) => {
      console.error('Save error:', err);
      showToast(err.message || 'Failed to save settings', 'error');
    }
  });

  const addMilestone = () => {
    setMilestones([...milestones, { 
      name: 'New Milestone', 
      sales_target: 0, 
      revenue_target: 0, 
      badge_icon: 'Award',
      badge_color: 'amber'
    }]);
  };

  const seedExpertMilestones = () => {
    const expertMilestones = [
      { name: 'Ignition', sales_target: 1, revenue_target: 0, badge_icon: 'Award', badge_color: 'amber' },
      { name: 'Turbo Charged', sales_target: 5, revenue_target: 2500000, badge_icon: 'Zap', badge_color: 'amber' },
      { name: 'Silver Steering', sales_target: 10, revenue_target: 5000000, badge_icon: 'Target', badge_color: 'slate' },
      { name: 'Gold Gearhead', sales_target: 25, revenue_target: 15000000, badge_icon: 'Zap', badge_color: 'yellow' },
      { name: 'Platinum Piston', sales_target: 50, revenue_target: 30000000, badge_icon: 'TrendingUp', badge_color: 'indigo' },
      { name: 'Diamond Drive', sales_target: 100, revenue_target: 70000000, badge_icon: 'Target', badge_color: 'cyan' },
      { name: 'The Fuel Godfather', sales_target: 250, revenue_target: 200000000, badge_icon: 'Award', badge_color: 'purple' },
    ];
    setMilestones(expertMilestones);
    showToast('Automotive Expert milestones loaded. Save to apply.', 'info');
  };

  const removeMilestone = async (index: number) => {
    const m = milestones[index];
    if (m.id) {
       await (supabase as any).from('achievement_milestones').delete().eq('id', m.id);
    }
    setMilestones(milestones.filter((_, i) => i !== index));
  };

  const updateMilestone = (index: number, updates: any) => {
    const next = [...milestones];
    next[index] = { ...next[index], ...updates };
    setMilestones(next);
  };

  if (configLoading) return <PageWrapper title="Achievement Settings"><div className="p-8 text-center text-slate-500">Loading...</div></PageWrapper>;

  return (
    <PageWrapper 
      title="Achievement Settings" 
      backLink={{ label: 'Settings', path: '/admin/settings/catalog' }}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8 space-y-8 pb-20">
        
        <section>
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Sales Milestones
              </h2>
              <p className="text-sm text-slate-500">Define the targets for your sales team to unlock bonuses and badges.</p>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={seedExpertMilestones} 
              className="font-bold border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100"
            >
              <Zap className="w-4 h-4 mr-2" /> {milestones.length === 0 ? 'Load Expert Presets' : 'Reset to Expert'}
            </Button>
          </div>

          <div className="space-y-4">
            {milestones.map((m, i) => (
              <Card key={i} className="p-5 border-slate-200 shadow-sm relative group overflow-visible">
                <button 
                  onClick={() => removeMilestone(i)}
                  className="absolute -right-2 -top-2 w-8 h-8 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-300 hover:text-red-500 transition-all shadow-sm opacity-0 group-hover:opacity-100 z-10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-2">
                  <div className="md:col-span-3">
                    <Input 
                      label="Milestone Name"
                      value={m.name}
                      onChange={e => updateMilestone(i, { name: e.target.value })}
                      placeholder="e.g. Silver Steering"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Input 
                      label="Sales"
                      type="number"
                      value={m.sales_target}
                      onChange={e => updateMilestone(i, { sales_target: parseInt(e.target.value) || 0 })}
                      placeholder="0 for none"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <Input 
                      label="Revenue (₹)"
                      type="number"
                      value={m.revenue_target}
                      onChange={e => updateMilestone(i, { revenue_target: parseFloat(e.target.value) || 0 })}
                      placeholder="0 for none"
                    />
                  </div>
                  <div className="md:col-span-2">
                   <label className="block text text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 pl-1">Theme</label>
                   <div className="flex flex-wrap gap-1.5">
                      {[
                        { color: 'amber', label: 'Rookie' },
                        { color: 'slate', label: 'Silver' },
                        { color: 'yellow', label: 'Gold' },
                        { color: 'indigo', label: 'Platinum' },
                        { color: 'cyan', label: 'Diamond' },
                        { color: 'purple', label: 'Boss' }
                      ].map(c => (
                        <button
                          key={c.color}
                          title={c.label}
                          onClick={() => updateMilestone(i, { badge_color: c.color })}
                          className={cn(
                            "w-6 h-6 rounded-full border-2 transition-all",
                            m.badge_color === c.color ? "border-slate-900 scale-110 shadow-sm" : "border-transparent opacity-60 hover:opacity-100"
                          )}
                          style={{ backgroundColor: 
                            c.color === 'amber' ? '#f59e0b' : 
                            c.color === 'slate' ? '#94a3b8' : 
                            c.color === 'yellow' ? '#facc15' : 
                            c.color === 'indigo' ? '#4f46e5' : 
                            c.color === 'cyan' ? '#06b6d4' : 
                            '#1e1b4b' 
                          }}
                        />
                      ))}
                   </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 pl-1">Icon</label>
                    <div className="flex gap-1.5">
                        {[
                          { id: 'Award', icon: Award },
                          { id: 'Target', icon: Target },
                          { id: 'Zap', icon: Zap },
                          { id: 'TrendingUp', icon: TrendingUp }
                        ].map(item => (
                          <button
                            key={item.id}
                            onClick={() => updateMilestone(i, { badge_icon: item.id })}
                            className={cn(
                              "p-1.5 rounded bg-slate-50 border transition-all",
                              m.badge_icon === item.id ? "border-slate-400 text-slate-900" : "border-transparent text-slate-400"
                            )}
                          >
                            <item.icon className="w-3.5 h-3.5" />
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1 border-dashed border-2 py-4 h-auto hover:bg-slate-50 hover:border-indigo-200" onClick={addMilestone}>
                <Plus className="w-4 h-4 mr-2" /> Add Custom Milestone
              </Button>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4">
             <h2 className="text-lg font-bold text-slate-900">Achievement Quote</h2>
             <p className="text-sm text-slate-500">The motivational quote shown on the achievements card.</p>
          </div>
          <Card className="p-5 border-slate-200 shadow-sm">
             <textarea
               className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[100px]"
               value={quote}
               onChange={e => setQuote(e.target.value)}
               placeholder="Enter a motivational quote..."
             />
          </Card>
        </section>

        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white/80 backdrop-blur-md border-t border-slate-200 py-4 px-6 lg:px-8 z-50">
          <div className="max-w-4xl mx-auto flex justify-end gap-3 w-full">
            <Button 
              variant="secondary" 
              onClick={() => {
                setHasInitialized(false);
                queryClient.invalidateQueries({ queryKey: ['achievement_config', tenantId] });
              }}
              disabled={saveMutation.isPending}
            >
              Cancel
            </Button>
            <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>

      </div>
    </PageWrapper>
  );
}
