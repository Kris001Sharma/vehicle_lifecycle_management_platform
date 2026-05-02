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
      console.error('TURNSTILE_SECRET_KEY is missing in Edge Function environment')
      return new Response(
        JSON.stringify({ valid: false, error: 'Server configuration error' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // siteverify expects either multipart/form-data or application/x-www-form-urlencoded.
    // Using FormData is generally the most reliable way as Deno fetch will handle the boundaries.
    const formData = new FormData()
    formData.append('secret', secretKey)
    formData.append('response', token)
    
    console.log('Invoking Cloudflare siteverify with FormData...')

    const result = await fetch('https://challenges.cloudflare.com/turnstile/v1/siteverify', {
      method: 'POST',
      body: formData,
    })

    if (!result.ok) {
      const errorText = await result.text()
      console.error(`Cloudflare API error ${result.status}:`, errorText)
      return new Response(
        JSON.stringify({ valid: false, error: `Cloudflare verify failed (${result.status})` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const outcome = await result.json()
    console.log('Verification outcome:', outcome)

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
