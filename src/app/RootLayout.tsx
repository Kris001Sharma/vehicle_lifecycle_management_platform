import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthInitializer } from '@/features/auth/hooks/useAuthInitializer';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Spinner } from '@/components/ui/Spinner';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import { InactivityWarningModal } from '@/features/auth/components/InactivityWarningModal';

function GlobalInactivityHandler({ children }: { children: React.ReactNode }) {
  const { showWarning, extendSession } = useInactivityLogout();

  return (
    <>
      {children}
      <InactivityWarningModal isOpen={showWarning} onExtend={extendSession} />
    </>
  );
}

export function RootLayout() {
  // Initialize auth session
  useAuthInitializer();
  
  const isLoading = useAuthStore((state) => state.isLoading);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <p className="text-sm font-medium text-slate-500">Initializing session...</p>
        </div>
      </div>
    );
  }

  return (
    <GlobalInactivityHandler>
      <Outlet />
    </GlobalInactivityHandler>
  );
}
