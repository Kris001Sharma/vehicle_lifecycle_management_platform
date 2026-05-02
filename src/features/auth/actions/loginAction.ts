import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '../store/authStore';
import { extractUserFromSession } from '../utils/extractUser';

// We map error codes or messages to user-friendly messages
function mapAuthError(error: any): string {
  const message = error?.message || '';
  if (message.toLowerCase().includes('invalid login credentials')) {
    return 'Incorrect email or password';
  }
  if (message.toLowerCase().includes('email not confirmed')) {
    return 'Account not confirmed. Contact admin.';
  }
  return 'Sign in failed. Please try again.';
}

export const loginAction = async (email: string, password: string, turnstileToken: string) => {
  try {
    // 1. Verify Turnstile
    const { data: turnstileData, error: turnstileError } = await supabase.functions.invoke('verify-turnstile', {
      body: { token: turnstileToken }
    });
    
    if (turnstileError) {
      console.error('Turnstile verification invocation error:', turnstileError);
      return { success: false, error: 'Security check failed. Please refresh and retry.' };
    }

    if (!turnstileData?.valid) {
      console.error('Turnstile verification failed response:', turnstileData);
      const errorMsg = turnstileData?.error ? `: ${turnstileData.error}` : '';
      return { success: false, error: `Security check failed${errorMsg}. Please try again.` };
    }

    // Attempt to get IP from client headers (not always reliable in browser, but best effort)
    const ipResponse = await fetch('https://api.ipify.org?format=json').catch(() => null);
    let ipAddress = 'unknown';
    if (ipResponse && ipResponse.ok) {
      const ipData = await ipResponse.json();
      ipAddress = ipData.ip;
    }

    // 2. Call check_login_rate RPC
    // @ts-ignore - typing isn't aware of this new RPC
    const { data: rawRateData, error: rateError } = await supabase.rpc('check_login_rate', {
      p_email: email,
      p_ip: ipAddress
    });

    const rateData = rawRateData as any[] | null;

    if (!rateError && rateData && rateData.length > 0) {
      const { is_locked_email, is_locked_ip } = rateData[0];
      if (is_locked_email) {
        return { success: false, error: 'Too many failed attempts. Try again in 15 minutes.' };
      }
      if (is_locked_ip) {
        return { success: false, error: 'Too many failed attempts from this device. Try again in 15 minutes.' };
      }
      // If attempts_remaining is 0 but not locked yet, it will be locked on next fail
    }

    const { data: { session }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // @ts-ignore
      await supabase.from('login_attempts').insert({ email, ip_address: ipAddress, success: false }).then();
      let remainingStr = '';
      if (!rateError && rateData && rateData.length > 0 && rateData[0].attempts_remaining > 0) {
        remainingStr = ` ${rateData[0].attempts_remaining - 1} attempts remaining.`;
      }
      return { success: false, error: mapAuthError(error) + remainingStr };
    }

    if (!session) {
      // @ts-ignore
      await supabase.from('login_attempts').insert({ email, ip_address: ipAddress, success: false }).then();
      return { success: false, error: 'Sign in failed. Please try again.' };
    }

    const user = extractUserFromSession(session);

    // Query user_profiles to check is_active
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('is_active')
      .eq('id', user.id)
      .maybeSingle();

    // @ts-ignore
    if (profileError || !profile || !profile.is_active) {
      await supabase.auth.signOut();
      return { success: false, error: 'Account is inactive. Contact your administrator.' };
    }

    // @ts-ignore
    await supabase.from('login_attempts').insert({ email, ip_address: ipAddress, success: true }).then();

    // Fire and forget last_login_at update
    supabase
      .from('user_profiles')
      // @ts-ignore
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id)
      .then();

    // Set user in store
    useAuthStore.getState().setUser(user);

    return { success: true, role: user.role };
  } catch (err) {
    return { success: false, error: mapAuthError(err) };
  }
};
