import React, { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock safeReload
vi.mock('@/utils/safeReload', () => ({
  safeReload: vi.fn().mockResolvedValue(undefined),
}));

// Mock ErrorBoundary to pass children through
vi.mock('./ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock LoadingSpinner - use full path since vi.mock is relative to test file
vi.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: ({ text }: { text?: string }) => <div data-testid="loading-spinner">{text}</div>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <span data-testid="alert-triangle" />,
  RefreshCw: () => <span data-testid="refresh-cw" />,
  Trash2: () => <span data-testid="trash2" />,
}));

import { LazyRoute } from '../LazyRoute';

describe('LazyRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render children when no errors occur', () => {
    render(
      <LazyRoute>
        <div data-testid="child-content">Hello</div>
      </LazyRoute>,
    );
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should render default loading fallback when suspense triggers', () => {
    const LazyChild = React.lazy(() => new Promise(() => {})); // Never resolves

    render(
      <LazyRoute>
        <LazyChild />
      </LazyRoute>,
    );

    // The default loader renders "Loading..." text
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render custom fallback when provided', () => {
    const LazyChild = React.lazy(() => new Promise(() => {}));
    const customFallback = <div data-testid="custom-fallback">Custom Loading...</div>;

    render(
      <LazyRoute fallback={customFallback}>
        <LazyChild />
      </LazyRoute>,
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
  });

  it('should wrap children in ErrorBoundary and Suspense', () => {
    render(
      <LazyRoute>
        <div>Test Content</div>
      </LazyRoute>,
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});
