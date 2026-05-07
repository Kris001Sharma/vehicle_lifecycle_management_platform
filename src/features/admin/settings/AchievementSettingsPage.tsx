import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/authStore';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/hooks/useToast';
import { Save, Trophy, Plus, Trash2, Award, Target, TrendingUp, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/utils/cn';

export function AchievementSettingsPage() {
  const user = useAuthStore(s => s.user);
  const tenantId = user?.tenantId;
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [milestones, setMilestones] = useState<any[]>([]);
  const [quote, setQuote] = useState('');

  const { isLoading: configLoading } = useQuery({
    queryKey: ['achievement_config', tenantId],
    queryFn: async () => {
      const [milestoneRes, configRes] = await Promise.all([
        supabase.from('achievement_milestones').select('*').eq('tenant_id', tenantId).order('order_index', { ascending: true }),
        supabase.from('tenant_achievement_config').select('*').eq('tenant_id', tenantId).single()
      ]);

      if (milestoneRes.data) setMilestones(milestoneRes.data);
      if (configRes.data) setQuote(configRes.data.quote || '');
      
      return { milestones: milestoneRes.data, config: configRes.data };
    },
    enabled: !!tenantId,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      // 1. Upsert Milestones (this is a bit tricky with direct supabase, usually we'd have a function)
      // For simplicity in this demo environment, we'll delete and re-insert or update individually.
      // Better: Use a single transaction/RPC if possible.
      
      const { error: configError } = await supabase
        .from('tenant_achievement_config')
        .upsert({ tenant_id: tenantId, quote }, { onConflict: 'tenant_id' });

      if (configError) throw configError;

      // Handle milestones: delete removed ones, upsert existing
      // For this implementation, we'll just upsert all current ones.
      if (milestones.length > 0) {
        const { error: milestoneError } = await supabase
          .from('achievement_milestones')
          .upsert(milestones.map((m, i) => ({
            ...m,
            tenant_id: tenantId,
            order_index: i
          })));
        if (milestoneError) throw milestoneError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['achievement_config', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['milestones', tenantId] });
      showToast('Achievement settings saved', 'success');
    },
    onError: (err: any) => {
      showToast(err.message, 'error');
    }
  });

  const addMilestone = () => {
    setMilestones([...milestones, { 
      name: 'New Milestone', 
      sales_target: 10, 
      revenue_target: 5000000, 
      badge_icon: 'Award',
      badge_color: 'amber'
    }]);
  };

  const removeMilestone = async (index: number) => {
    const m = milestones[index];
    if (m.id) {
       await supabase.from('achievement_milestones').delete().eq('id', m.id);
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
    <PageWrapper title="Achievement Settings" backLink={{ label: 'Settings', path: '/admin/settings/catalog' }}>
      <div className="max-w-4xl space-y-8 pb-20">
        
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Sales Milestones
            </h2>
            <p className="text-sm text-slate-500">Define the targets for your sales team to unlock bonuses and badges.</p>
          </div>

          <div className="space-y-4">
            {milestones.map((m, i) => (
              <Card key={i} className="p-5 border-slate-200 shadow-sm relative group">
                <button 
                  onClick={() => removeMilestone(i)}
                  className="absolute right-4 top-4 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                  <div className="lg:col-span-1">
                    <Input 
                      label="Milestone Name"
                      value={m.name}
                      onChange={e => updateMilestone(i, { name: e.target.value })}
                      placeholder="e.g. Silver Seller"
                    />
                  </div>
                  <div>
                    <Input 
                      label="Sales Target"
                      type="number"
                      value={m.sales_target}
                      onChange={e => updateMilestone(i, { sales_target: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Input 
                      label="Revenue Target (₹)"
                      type="number"
                      value={m.revenue_target}
                      onChange={e => updateMilestone(i, { revenue_target: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 pl-1">Badge Icon</label>
                   <div className="flex gap-2">
                      {['Award', 'Target', 'TrendingUp', 'Zap'].map(icon => (
                        <button
                          key={icon}
                          onClick={() => updateMilestone(i, { badge_icon: icon })}
                          className={cn(
                            "p-2 rounded-lg border transition-all",
                            m.badge_icon === icon ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-100 text-slate-400 hover:bg-slate-50"
                          )}
                        >
                          {icon === 'Award' && <Award className="w-4 h-4" />}
                          {icon === 'Target' && <Target className="w-4 h-4" />}
                          {icon === 'TrendingUp' && <TrendingUp className="w-4 h-4" />}
                          {icon === 'Zap' && <Zap className="w-4 h-4" />}
                        </button>
                      ))}
                   </div>
                  </div>
                </div>
              </Card>
            ))}

            <Button variant="secondary" className="w-full border-dashed border-2 py-6 h-auto hover:bg-slate-50 hover:border-indigo-200" onClick={addMilestone}>
              <Plus className="w-4 h-4 mr-2" /> Add Milestone
            </Button>
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
            <Button disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? 'Saving...' : 'Save Achievement Settings'}
            </Button>
          </div>
        </div>

      </div>
    </PageWrapper>
  );
}
