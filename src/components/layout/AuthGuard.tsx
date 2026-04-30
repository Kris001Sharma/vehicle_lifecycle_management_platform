import React from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function AuthGuard({ children }: AuthGuardProps) {
  // Placeholder implementation for Phase 2
  // Real implementation will come in Phase 4
  return <>{children}</>;
}
