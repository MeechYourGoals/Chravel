import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../ErrorBoundary';

// Mock safeReload
vi.mock('@/utils/safeReload', () => ({
  safeReload: vi.fn().mockResolvedValue(undefined),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <span data-testid="alert-icon" />,
  RefreshCw: () => <span data-testid="refresh-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
}));

// Component that throws an error
const ThrowingComponent = ({ error }: { error: Error }) => {
  throw error;
};

// Suppress console.error for expected errors in tests
const suppressConsole = () => {
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });
};

describe('ErrorBoundary', () => {
  suppressConsole();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock import.meta.env.DEV - expects boolean
    vi.stubEnv('DEV', false);
    // Mock window.gtag
    (window as any).gtag = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete (window as any).gtag;
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Hello</div>
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should render error UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('Test error')} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/We're sorry, but something unexpected happened/)).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div data-testid="custom-fallback">Custom Error</div>}>
        <ThrowingComponent error={new Error('Test error')} />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
  });

  it('should detect chunk loading errors and show cache clear button', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent
          error={new Error('Failed to fetch dynamically imported module /foo.js')}
        />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Failed to Load Page')).toBeInTheDocument();
    expect(screen.getByText('Clear Cache & Reload')).toBeInTheDocument();
  });

  it('should show compact error view when compact prop is true', () => {
    render(
      <ErrorBoundary compact>
        <ThrowingComponent error={new Error('Test error')} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Please try again.')).toBeInTheDocument();
  });

  it('should show compact chunk error with reload button', () => {
    render(
      <ErrorBoundary compact>
        <ThrowingComponent error={new Error('Loading chunk 123 failed')} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Failed to load content')).toBeInTheDocument();
    expect(screen.getByText('Reload')).toBeInTheDocument();
  });

  it('should call onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    const { rerender } = render(
      <ErrorBoundary onRetry={onRetry}>
        <ThrowingComponent error={new Error('Test error')} />
      </ErrorBoundary>,
    );

    const retryButton = screen.getByText('Try Again');
    await user.click(retryButton);
    expect(onRetry).toHaveBeenCalled();
  });

  it('should call safeReload when Refresh Page button is clicked', async () => {
    const { safeReload } = await import('@/utils/safeReload');
    const user = userEvent.setup();

    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('Non-chunk error')} />
      </ErrorBoundary>,
    );

    const refreshButton = screen.getByText('Refresh Page');
    await user.click(refreshButton);
    expect(safeReload).toHaveBeenCalled();
  });

  it('should send gtag event when error is caught', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent error={new Error('Tracked error')} />
      </ErrorBoundary>,
    );
    expect((window as any).gtag).toHaveBeenCalledWith('event', 'exception', {
      description: 'Tracked error',
      fatal: false,
    });
  });

  it('should recognize various chunk error patterns', () => {
    const chunkErrors = [
      'Loading chunk 123 failed',
      'ChunkLoadError: Loading chunk',
      'Loading CSS chunk abc failed',
      'Importing a module script failed',
      'error loading dynamically imported module',
      'Failed to load module script',
    ];

    for (const errorMsg of chunkErrors) {
      const { unmount } = render(
        <ErrorBoundary>
          <ThrowingComponent error={new Error(errorMsg)} />
        </ErrorBoundary>,
      );
      expect(screen.getByText('Failed to Load Page')).toBeInTheDocument();
      unmount();
    }
  });
});
