const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN')

if (!ALLOWED_ORIGIN) {
  console.warn('ALLOWED_ORIGIN secret is not set. Defaulting to strict mode.')
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN || 'https://vlm-platform.pages.dev',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  return null
}
