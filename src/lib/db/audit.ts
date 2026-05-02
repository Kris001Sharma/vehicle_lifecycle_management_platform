import { supabase } from '@/lib/supabase/client';

export type AuditLogFilter = {
  tableName?: string;
  action?: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT';
  fromDate?: string;
  toDate?: string;
  userEmail?: string;
};

export async function getAuditLogs(tenantId: string, filters: AuditLogFilter, page: number, pageSize: number) {
  let query = supabase
    .from('audit_logs')
    .select(`
      *,
      user_profiles (
        email
      )
    `, { count: 'exact' })
    .eq('tenant_id', tenantId);

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
  // To filter by user email, we would ideally need an RPC or joining on Supabase.
  // We can't filter the parent easily by a joined table's non-foreign key in PostgREST unless we use inner joins
  if (filters.userEmail) {
    // This inner join filter forces only rows that match the email
    query = query.eq('user_profiles.email', filters.userEmail).not('user_profiles', 'is', null);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw error;
  }

  return { data, count: count || 0 };
}
