import React from 'react';
import { logErrorToSupabase } from '@/lib/supabase/error-logger';

type State = { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null };

export class RootErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    logErrorToSupabase(error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-gray-900 p-4">
          <h1 className="text-3xl font-bold mb-2">{import.meta.env.VITE_APP_NAME || 'VLM Platform'}</h1>
          <h2 className="text-xl font-semibold mb-6 text-red-600">Something went wrong</h2>
          
          {import.meta.env.DEV && this.state.error && (
            <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-auto max-w-full mb-6">
              {this.state.error.toString()}
            </pre>
          )}

          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Reload application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
