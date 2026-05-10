import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/hooks/useToast';
import { Settings, ShieldCheck, FileText, ClipboardCheck, Zap } from 'lucide-react';
import { cn } from '@/utils/cn';

interface WorkflowConfig {
  id: string;
  tenant_id: string;
  enable_pdi: boolean;
  enable_document_verification: boolean;
  enable_warranty_activation: boolean;
  require_documents: boolean;
}

export function WorkflowSettingsPage() {
  const { tenantId } = useAuthStore(s => s.user!) || {};
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const { data: config, isLoading } = useQuery({
    queryKey: ['workflow_config', tenantId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('tenant_workflow_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      
      // If no config exists, return defaults
      if (!data) {
        return {
          enable_pdi: true,
          enable_document_verification: true,
          enable_warranty_activation: true,
          require_documents: false,
        } as WorkflowConfig;
      }
      
      return data as WorkflowConfig;
    },
    enabled: !!tenantId,
  });

  const mutation = useMutation({
    mutationFn: async (updated: Partial<WorkflowConfig>) => {
      // Upsert logic
      const { data: existing } = await (supabase as any)
        .from('tenant_workflow_config')
        .select('id')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (existing) {
        const { error } = await (supabase as any)
          .from('tenant_workflow_config')
          .update(updated)
          .eq('tenant_id', tenantId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('tenant_workflow_config')
          .insert({
            tenant_id: tenantId,
            ...updated
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow_config', tenantId] });
      showToast('Workflow settings updated', 'success');
    },
    onError: (err: any) => {
      showToast(err.message || 'Failed to update workflow', 'error');
    }
  });

  const toggle = (field: keyof WorkflowConfig, current: boolean) => {
    mutation.mutate({ [field]: !current });
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Settings className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Handover Governance</h1>
          <p className="text-sm text-slate-500">Configure the mandatory steps for a successful vehicle delivery.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <WorkflowCard
          title="PDI Checklist"
          description="Pre-Delivery Inspection. Verification of vehicle health before handover."
          icon={<ClipboardCheck className="w-5 h-5" />}
          enabled={config?.enable_pdi ?? true}
          onToggle={() => toggle('enable_pdi', config?.enable_pdi ?? true)}
          loading={mutation.isPending}
        />
        <WorkflowCard
          title="Document Verification"
          description="Ensures all registration, insurance, and ID documents are collected."
          icon={<FileText className="w-5 h-5" />}
          enabled={config?.enable_document_verification ?? true}
          onToggle={() => toggle('enable_document_verification', config?.enable_document_verification ?? true)}
          loading={mutation.isPending}
        />
        <WorkflowCard
          title="Warranty Activation"
          description="Digital activation of the OEM warranty during the final handover step."
          icon={< ShieldCheck className="w-5 h-5" />}
          enabled={config?.enable_warranty_activation ?? true}
          onToggle={() => toggle('enable_warranty_activation', config?.enable_warranty_activation ?? true)}
          loading={mutation.isPending}
        />
        <WorkflowCard
          title="Mandatory Docs"
          description="If enabled, sales cannot be recorded without basic document uploads."
          icon={<Zap className="w-5 h-5" />}
          enabled={config?.require_documents ?? false}
          onToggle={() => toggle('require_documents', config?.require_documents ?? false)}
          loading={mutation.isPending}
        />
      </div>

      <div className="mt-12 p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Zap className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">Pro-Tip: Reducing Friction</h3>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">
            If your dealership prioritizes speed over compliance, you can disable these steps to allow "Express Sales". 
            <strong> All steps are enabled by default</strong> to ensure maximum data integrity and customer satisfaction.
          </p>
        </div>
      </div>
    </div>
  );
}

interface WorkflowCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled: boolean;
  onToggle: () => void;
  loading: boolean;
}

function WorkflowCard({ title, description, icon, enabled, onToggle, loading }: WorkflowCardProps) {
  return (
    <Card className={cn(
      "p-6 transition-all duration-300 border shadow-sm flex flex-col items-center text-center",
      enabled ? "border-indigo-100 bg-white" : "border-slate-100 bg-slate-50/50 opacity-80"
    )}>
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
        enabled ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-400"
      )}>
        {icon}
      </div>
      <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-xs text-slate-500 mb-6 leading-relaxed flex-grow">
        {description}
      </p>
      
      <button
        onClick={onToggle}
        disabled={loading}
        className={cn(
          "w-full py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
          enabled 
            ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200" 
            : "bg-slate-200 text-slate-600 hover:bg-slate-300"
        )}
      >
        {enabled ? 'Active' : 'Disabled'}
      </button>
    </Card>
  );
}
