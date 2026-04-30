import { create } from 'zustand';
import { AuthState } from '@/types/auth.types';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) => set({ 
    user, 
    isAuthenticated: !!user, 
    isLoading: false 
  }),
  setLoading: (isLoading) => set({ isLoading }),
  clearAuth: () => set({ 
    user: null, 
    isAuthenticated: false, 
    isLoading: false 
  }),
}));
