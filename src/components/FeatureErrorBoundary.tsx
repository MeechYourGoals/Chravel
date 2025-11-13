import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { errorTracking } from '@/services/errorTracking';

interface Props {
  children: ReactNode;
  featureName: string;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorCount: number;
}

/**
 * Feature-level error boundary for graceful degradation
 * 
 * Usage:
 * ```tsx
 * <FeatureErrorBoundary featureName="TripChat">
 *   <TripChatComponent />
 * </FeatureErrorBoundary>
 * ```
 */
export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { featureName, onError } = this.props;
    
    // Log to error tracking service
    errorTracking.captureException(error, {
      context: `FeatureErrorBoundary:${featureName}`,
      additionalData: {
        componentStack: errorInfo.componentStack,
        errorCount: this.state.errorCount + 1
      }
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }

    // Increment error count
    this.setState(prevState => ({
      errorCount: prevState.errorCount + 1
    }));

    // If errors keep happening, we might want to disable retries
    if (this.state.errorCount > 3) {
      if (import.meta.env.DEV) {
        console.error(`[FeatureErrorBoundary] Too many errors in ${featureName}, stopping retries`);
      }
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null
    });
    
    errorTracking.addBreadcrumb({
      category: 'user-action',
      message: `User reset error boundary for ${this.props.featureName}`,
      level: 'info'
    });
  };

  render() {
    const { hasError, error, errorCount } = this.state;
    const { children, featureName, fallback } = this.props;

    if (hasError) {
      // If custom fallback provided, use it
      if (fallback) {
        return <>{fallback}</>;
      }

      // Default error UI
      return (
        <div className="p-4">
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Something went wrong in {featureName}</AlertTitle>
            <AlertDescription>
              {error?.message || 'An unexpected error occurred'}
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button 
              onClick={this.handleReset}
              variant="outline"
              size="sm"
              disabled={errorCount > 3}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {errorCount > 3 ? 'Too many errors' : 'Try Again'}
            </Button>
          </div>

          {import.meta.env.DEV && error && (
            <details className="mt-4 p-4 bg-destructive/10 rounded-md text-sm">
              <summary className="cursor-pointer font-semibold">
                Error Details (Development Only)
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs">
                {error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return children;
  }
}

