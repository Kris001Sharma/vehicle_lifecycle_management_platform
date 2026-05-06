import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/features/auth/store/authStore';

export function useFinanceEnabled(): boolean {
  const tenantId = useAuthStore(s => s.user?.tenantId);
  const { data } = useQuery({
    queryKey: ['catalog-config', tenantId],
    enabled: !!tenantId,
    staleTime: 1000 * 60 * 10,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('tenant_catalog_config')
        .select('finance_tracking_enabled')
        .eq('tenant_id', tenantId!)
        .single();
      return data;
    },
  });
  return data?.finance_tracking_enabled ?? false;
}
