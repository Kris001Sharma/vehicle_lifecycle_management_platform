import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '../../auth/store/authStore';

export const logoutAction = async (): Promise<void> => {
  await supabase.auth.signOut();
  useAuthStore.getState().clearAuth();
};
