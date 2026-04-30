import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '../store/authStore';
import { extractUserFromSession } from '../utils/extractUser';

export function useAuthInitializer() {
  const { setUser, clearAuth, setLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Initial Session Check
    const initSession = async () => {
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (session) {
          // Verify user is active in user_profiles
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('is_active')
            .eq('id', session.user.id)
            .maybeSingle();

          // @ts-ignore - sync issue with generated types
          if (profileError || !profile || !profile.is_active) {
            console.warn('User is inactive or profile missing');
            await supabase.auth.signOut();
            clearAuth();
            navigate('/login');
            return;
          }

          const user = extractUserFromSession(session);
          setUser(user);
        } else {
          clearAuth();
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        clearAuth();
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // 2. Auth State Change Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const user = extractUserFromSession(session);
        setUser(user);
      } else {
        clearAuth();
        if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
          navigate('/login');
        }
      }
    });

    // 3. Tab Visibility / Expiry Check
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Additional check: Is the session older than 8 hours since the last profile login?
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('last_login_at, is_active')
            .eq('id', session.user.id)
            .maybeSingle();

          const now = new Date();
          // @ts-ignore
          const lastLogin = profile?.last_login_at ? new Date(profile.last_login_at) : null;
          const eightHoursInMs = 8 * 60 * 60 * 1000;

          // @ts-ignore
          if (!profile?.is_active || (lastLogin && now.getTime() - lastLogin.getTime() > eightHoursInMs)) {
            console.warn('Session expired or user deactivated');
            await supabase.auth.signOut();
            clearAuth();
            navigate('/login');
            return;
          }

          setUser(extractUserFromSession(session));
        } else {
          clearAuth();
          navigate('/login');
        }
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setUser, clearAuth, setLoading, navigate]);
}
