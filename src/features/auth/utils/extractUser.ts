import { Session } from '@supabase/supabase-js';
import { AuthUser, UserRole } from '@/types/auth.types';

/**
 * Extracts AuthUser profile from Supabase Session app_metadata
 * app_metadata is server-side injected and immutable by client
 */
export function extractUserFromSession(session: Session): AuthUser {
  const { user } = session;
  const metadata = user.app_metadata;

  const role = metadata.role as UserRole;
  const tenantId = metadata.tenant_id as string;
  const fullName = metadata.full_name as string || user.email || 'Unknown User';

  if (!role) {
    throw new Error('Role is missing in session metadata');
  }
  
  if (!tenantId) {
    throw new Error('Tenant ID is missing in session metadata');
  }

  return {
    id: user.id,
    email: user.email || '',
    role,
    tenantId,
    fullName,
    lastLoginAt: user.last_sign_in_at,
  };
}
