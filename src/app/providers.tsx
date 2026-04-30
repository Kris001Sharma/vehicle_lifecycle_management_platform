import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootErrorBoundary } from '@/components/errors/RootErrorBoundary';

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
  return (
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </RootErrorBoundary>
  );
}
