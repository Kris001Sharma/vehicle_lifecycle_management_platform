import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const { token } = await req.json()
    
    if (!token) {
      return new Response(
        JSON.stringify({ valid: false, error: 'No token provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const secretKey = Deno.env.get('TURNSTILE_SECRET_KEY')

    if (!secretKey) {
      console.error('CRITICAL: TURNSTILE_SECRET_KEY is missing in Edge Function environment')
      return new Response(
        JSON.stringify({ valid: false, error: 'Internal Server Error: Secret key missing' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Standard Cloudflare siteverify expects application/x-www-form-urlencoded
    const params = new URLSearchParams();
    params.append('secret', secretKey);
    params.append('response', token);

    console.log('Sending verification request to Cloudflare siteverify...')

    const result = await fetch('https://challenges.cloudflare.com/turnstile/v1/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString(),
    })

    if (!result.ok) {
      const errorText = await result.text()
      console.error(`Cloudflare API returned ${result.status}:`, errorText)
      return new Response(
        JSON.stringify({ valid: false, error: `Cloudflare connectivity issue (${result.status})` }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const outcome = await result.json()
    console.log('Cloudflare verification outcome:', outcome)

    return new Response(
      JSON.stringify({ 
        valid: outcome.success, 
        errorCodes: outcome['error-codes'] 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge Function internal error:', error)
    return new Response(
      JSON.stringify({ valid: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
