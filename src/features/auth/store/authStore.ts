import { create } from 'zustand';
import { AuthState } from '@/types/auth.types';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  authError: false,
  setUser: (user) => set({ 
    user, 
    isAuthenticated: !!user, 
    isLoading: false,
    authError: false
  }),
  setLoading: (isLoading) => set({ isLoading }),
  setAuthError: (authError) => set({ authError, isLoading: false }),
  clearAuth: () => set({ 
    user: null, 
    isAuthenticated: false, 
    isLoading: false 
  }),
}));
