import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { hapticService } from '../../services/hapticService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class MobileErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Mobile Error Boundary caught:', error, errorInfo);
    hapticService.heavy();
  }

  handleReset = async () => {
    await hapticService.light();
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black p-6">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 max-w-md">
            <AlertTriangle className="text-red-400 mx-auto mb-4" size={48} />
            <h2 className="text-xl font-bold text-white text-center mb-2">Something went wrong</h2>
            <p className="text-gray-400 text-center mb-6 text-sm">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={this.handleReset}
              className="w-full bg-blue-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <RefreshCw size={20} />
              <span>Try Again</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
