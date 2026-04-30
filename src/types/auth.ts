import { Database } from './database';

export type UserRole = Database['public']['Enums']['user_role'];

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  fullName?: string;
}

export interface AuthState {
  user: UserProfile | null;
  session: any | null;
  isLoading: boolean;
}
