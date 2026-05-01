export async function logErrorToSupabase(params: {
  errorMessage: string;
  errorStack?: string;
  componentStack?: string;
  currentUrl: string;
  userId?: string;
  tenantId?: string;
}) {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      console.warn('Cannot log error to Supabase: Missing URL or Anon Key');
      return;
    }

    // Prepare payload matching error_logs table if applicable, or generic object structure.
    // For now we assume a basic error_logs table from Phase 1 or we construct it.
    // The prompt says "Body: the error_logs insert payload"
    const payload = {
      error_message: params.errorMessage,
      error_stack: params.errorStack || null,
      component_stack: params.componentStack || null,
      current_url: params.currentUrl,
      user_id: params.userId || null,
      tenant_id: params.tenantId || null,
    };

    fetch(`${supabaseUrl}/rest/v1/error_logs`, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(payload)
    }).catch((e) => {
      // Fire and forget - silent catch
      console.error('Failed to log error to Supabase (Network Error):', e);
    });
  } catch (error) {
    // Catch anything going wrong while forming the fetch request
    console.error('Failed to prepare Supabase error log request:', error);
  }
}
