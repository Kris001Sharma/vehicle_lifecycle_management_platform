import { UserRole } from '@/types/auth.types';

export function getRoleRedirect(role: UserRole | string): string {
  switch (role) {
    case 'admin':
      return '/admin';
    case 'sales':
      return '/sales';
    case 'service':
      return '/service';
    default:
      throw new Error(`Unrecognized user role: ${role}`);
  }
}
