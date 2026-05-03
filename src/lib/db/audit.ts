import { supabase } from '@/lib/supabase/client';

export type AuditLogFilter = {
  tableName?: string;
  action?: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';
  fromDate?: string;
  toDate?: string;
  userEmail?: string;
};

export async function getAuditLogs(tenantId: string, filters: AuditLogFilter, page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  async function performQuery(withJoin: boolean) {
    let query = supabase.from('audit_logs');
    
    if (withJoin) {
      query = query.select(`
        *,
        user_profiles (
          email
        )
      `, { count: 'exact' }) as any;
    } else {
      query = query.select('*', { count: 'exact' }) as any;
    }

    query = query.eq('tenant_id', tenantId);

    if (filters.tableName) {
      query = query.eq('table_name', filters.tableName);
    }
    if (filters.action) {
      query = query.eq('action', filters.action);
    }
    if (filters.fromDate) {
      query = query.gte('created_at', filters.fromDate);
    }
    if (filters.toDate) {
      query = query.lte('created_at', filters.toDate);
    }
    
    if (withJoin && filters.userEmail) {
      query = query.eq('user_profiles.email', filters.userEmail).not('user_profiles', 'is', null);
    }

    return query.order('created_at', { ascending: false }).range(from, to);
  }

  try {
    const { data, count, error } = await performQuery(true);
    
    if (error) {
      // PGRST200 means relationship not found in schema cache
      if (error.code === 'PGRST200') {
        const { data: simpleData, count: simpleCount, error: simpleError } = await performQuery(false);
        if (simpleError) throw simpleError;
        return { data: simpleData, count: simpleCount || 0 };
      }
      throw error;
    }
    
    return { data, count: count || 0 };
  } catch (error) {
    console.error('Audit Log Fetch Error:', error);
    throw error;
  }
}
