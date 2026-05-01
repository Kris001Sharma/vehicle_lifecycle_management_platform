import React from 'react';
import { logErrorToSupabase } from '@/utils/logErrorToSupabase';

type Props = { portalName?: string; children?: React.ReactNode };
type State = { hasError: boolean; error: Error | null; hasRetried: boolean };

export class RouteErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, hasRetried: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logErrorToSupabase({
      errorMessage: error.message,
      errorStack: error.stack,
      componentStack: errorInfo.componentStack || undefined,
      currentUrl: window.location.href,
    });
  }

  handleReset = () => {
    if (this.state.hasRetried) {
      window.location.reload();
    } else {
      this.setState({ hasError: false, error: null, hasRetried: true });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col p-8 bg-white min-h-[50vh] rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-2xl font-semibold mb-4 text-red-600">
            {this.props.portalName ? `${this.props.portalName} Error` : 'Page Error'}
          </h2>
          <p className="mb-4">
            {this.state.hasRetried 
              ? "The error persists. Please reload the page."
              : "We encountered an issue loading this section."
            }
          </p>
          
          {import.meta.env.DEV && this.state.error && (
            <pre className="bg-red-50 text-red-800 p-4 rounded-lg overflow-auto max-w-full mb-4 text-sm">
              {this.state.error.message}
            </pre>
          )}

          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 w-fit transition"
          >
            {this.state.hasRetried ? "Reload Page" : "Try again"}
          </button>
        </div>
      );
    }
    return this.props.children || null;
  }
}
