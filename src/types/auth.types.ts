export type UserRole = 'admin' | 'sales' | 'service';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
  fullName: string;
  lastLoginAt?: string;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (isLoading: boolean) => void;
  clearAuth: () => void;
}
