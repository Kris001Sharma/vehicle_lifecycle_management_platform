export function logErrorToSupabase(error: unknown, componentStack?: string | null) {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error('Missing Supabase credentials for error logging');
    return;
  }

  fetch(`${supabaseUrl}/rest/v1/error_logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      component_stack: componentStack,
      url: window.location.href,
      created_at: new Date().toISOString(),
    }),
  }).catch(() => {
    // Silently fail if logging fails
  });
}
