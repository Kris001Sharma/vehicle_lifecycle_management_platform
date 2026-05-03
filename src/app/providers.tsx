import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootErrorBoundary } from '@/components/errors/RootErrorBoundary';
import { useAuthStore } from '@/features/auth/store/authStore';
import { RefreshCcw } from 'lucide-react';
import { ToastContainer } from '@/components/ui/Toast';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const authError = useAuthStore((state) => state.authError);

  if (authError) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-6 flex-col">
        <div className="bg-white p-8 rounded-xl shadow-lg border border-rose-100 max-w-md text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-rose-50 rounded-full">
              <RefreshCcw className="h-8 w-8 text-rose-500" />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Unable to connect</h1>
          <p className="text-sm border-b border-rose-50 pb-6 text-slate-500 mb-6">
            We couldn't reach the authentication service. Please check your network connection and try reloading the page.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 bg-slate-900 text-white rounded font-medium hover:bg-slate-800 transition-colors"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
        <ToastContainer />
      </QueryClientProvider>
    </RootErrorBoundary>
  );
}

