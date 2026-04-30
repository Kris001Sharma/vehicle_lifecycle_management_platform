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

export const loginAction = async (email: string, password: string) => {
  try {
    const { data: { session }, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: mapAuthError(error) };
    }

    if (!session) {
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
