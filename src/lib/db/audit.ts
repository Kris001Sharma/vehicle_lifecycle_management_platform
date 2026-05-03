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

  async function performQuery() {
    let query: any = supabase.from('audit_logs').select('*', { count: 'exact' });

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

    // Since we don't have user_profiles join, filtering by user email will only match user_id directly if it happens to be an email
    // but typically user_id is a UUID. For now, if they filter by email, we ignore or map.
    if (filters.userEmail) {
      // Just filter by user_id assuming it might match if they typed a UUID
      query = query.eq('user_id', filters.userEmail);
    }

    return query.order('created_at', { ascending: false }).range(from, to);
  }

  try {
    const { data, count, error } = await performQuery();
    
    if (error) {
      throw error;
    }
    
    return { data, count: count || 0 };
  } catch (error) {
    console.error('Audit Log Fetch Error:', error);
    throw error;
  }
}
