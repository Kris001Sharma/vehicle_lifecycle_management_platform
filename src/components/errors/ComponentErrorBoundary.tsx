import React from 'react';
import { logErrorToSupabase } from '@/lib/supabase/error-logger';

type Props = { componentName: string; children: React.ReactNode };
type State = { hasError: boolean; error: Error | null };

export class ComponentErrorBoundary extends React.Component<Props, State> {
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
        <div className="border border-red-200 bg-red-50 p-4 rounded-md">
          <p className="text-sm font-semibold text-red-800 mb-2">
            Failed to load component: {this.props.componentName}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="text-xs px-3 py-1 bg-white border border-red-200 text-red-700 hover:bg-red-50 rounded transition"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
