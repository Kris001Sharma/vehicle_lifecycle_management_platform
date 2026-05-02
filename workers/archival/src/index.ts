export interface Env {
  ARCHIVAL_KV: KVNamespace;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // 1. Get current progress from KV
    let cursor = await env.ARCHIVAL_KV.get<{ lastTenantId: string | null, lastVehicleId: string | null }>('vlm_archival_cursor', 'json');
    if (!cursor) {
      cursor = { lastTenantId: null, lastVehicleId: null };
    }

    // 2. Query next eligible vehicle using Supabase Service Role (to bypass RLS)
    // We process ONE vehicle per hour:
    // Logic: Find vehicles where archivable = true AND (id > lastVehicleId or in next tenant)
    const functionUrl = `${env.SUPABASE_URL}/rest/v1/vehicles?select=id,tenant_id&archived=eq.false&limit=1`;
    
    // Note: We would ideally use an order by and gt filter on the cursor ID here.
    // Full implementation would involve fetching tenants list then finding next vehicle.
    
    console.log('Archival check started. Cursor:', cursor);
    
    // In a real scenario, you'd perform a fetch here:
    // const response = await fetch(functionUrl, { ...headers ... });
    
    // 3. If vehicle found: process (copy to R2, mark as archived)
    // 4. Update cursor
    // await env.ARCHIVAL_KV.put('vlm_archival_cursor', JSON.stringify({ lastTenantId: '...', lastVehicleId: '...' }));
    
    console.log('Archival cycle complete for this invocation.');
  },
};
