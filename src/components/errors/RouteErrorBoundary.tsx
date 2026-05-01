import React from 'react';
import { logErrorToSupabase } from '@/lib/supabase/error-logger';

type Props = { title?: string; children?: React.ReactNode };
type State = { hasError: boolean; error: Error | null };

export class RouteErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logErrorToSupabase(error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col p-8">
          <h2 className="text-2xl font-semibold mb-4 text-red-600">
            {this.props.title || 'Page Error'}
          </h2>
          <p className="mb-4">We encountered an issue loading this section.</p>
          
          {import.meta.env.DEV && this.state.error && (
            <pre className="bg-red-50 text-red-800 p-4 rounded-lg overflow-auto max-w-full mb-4 text-sm">
              {this.state.error.message}
            </pre>
          )}

          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 w-fit transition"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children || null;
  }
}
