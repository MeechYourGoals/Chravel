import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { SettingsMenu } from '../SettingsMenu';

/**
 * Strong hardening:
 * This suite is a "crash firewall" for Settings.
 *
 * It exercises the key rendering permutations that historically cause regressions:
 * - authenticated user
 * - super admin user
 * - logged out + demo app-preview (mock user path)
 * - logged out + demo off (login prompt path)
 * - mobile vs desktop (mobile shows the auth section in the main menu)
 * - consumer/enterprise/events tab switching
 *
 * The point is not to test every inner settings panel; it's to ensure
 * SettingsMenu itself never throws during mount/render across these modes.
 */

type MockUser = { id: string; email?: string } | null;

let mockUser: MockUser = { id: 'test-user-id', email: 'test@example.com' };
let mockDemoView: 'off' | 'app-preview' = 'off';
let mockIsMobile = false;
let mockIsSuperAdmin = false;
let mockConsumerThrows = false;
let mockEnterpriseThrows = false;
let mockEventsThrows = false;

// Keep test output clean: we only suppress known non-signal warnings.
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
  const first = args[0];
  const combined = args
    .map(arg => {
      if (arg instanceof Error) return arg.message;
      return String(arg);
    })
    .join(' ');

  if (typeof first === 'string' && first.includes('not wrapped in act')) {
    return;
  }

  if (
    typeof first === 'string' &&
    (first.startsWith('The above error occurred in the <') ||
      first.startsWith(
        'React will try to recreate this component tree from scratch using the error boundary you provided',
      ))
  ) {
    return;
  }

  // React logs the thrown error even when an ErrorBoundary correctly catches it.
  // In this file we intentionally throw to verify Settings stays mounted.
  if (combined.includes('crash (test)')) {
    return;
  }
  originalConsoleError(...(args as Parameters<typeof console.error>));
});
vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
  const first = args[0];
  if (typeof first === 'string' && first.startsWith('⚠️ React Router Future Flag Warning')) {
    return;
  }
  originalConsoleWarn(...(args as Parameters<typeof console.warn>));
});

vi.mock('../ConsumerSettings', () => ({
  ConsumerSettings: () => {
    if (mockConsumerThrows) {
      throw new Error('ConsumerSettings crash (test)');
    }
    return <div data-testid="consumer-settings" />;
  },
}));

vi.mock('../EnterpriseSettings', () => ({
  EnterpriseSettings: () => {
    if (mockEnterpriseThrows) {
      throw new Error('EnterpriseSettings crash (test)');
    }
    return <div data-testid="enterprise-settings" />;
  },
}));

vi.mock('../EventsSettings', () => ({
  EventsSettings: () => {
    if (mockEventsThrows) {
      throw new Error('EventsSettings crash (test)');
    }
    return <div data-testid="events-settings" />;
  },
}));

vi.mock('../ProUpgradeModal', () => ({
  ProUpgradeModal: () => null,
}));

vi.mock('../AuthModal', () => ({
  AuthModal: () => null,
}));

// Radix ScrollArea triggers async layout effects that can create noisy act() warnings.
// We don’t need to validate ScrollArea behavior here—only that SettingsMenu doesn't crash.
vi.mock('../ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ScrollBar: () => null,
}));

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    signOut: vi.fn(),
  }),
}));

vi.mock('../../hooks/use-mobile', () => ({
  useIsMobile: () => mockIsMobile,
}));

vi.mock('../../hooks/useDemoMode', () => ({
  useDemoMode: () => ({
    demoView: mockDemoView,
    isDemoMode: mockDemoView === 'app-preview',
  }),
}));

vi.mock('../../hooks/useSuperAdmin', () => ({
  useSuperAdmin: () => ({ isSuperAdmin: mockIsSuperAdmin }),
}));

vi.mock('../../contexts/TripVariantContext', () => ({
  useTripVariant: () => ({ variant: 'consumer' }),
}));

vi.mock('../../utils/authGate', () => ({
  createMockDemoUser: () => ({ id: 'demo-user-id', email: 'demo@example.com' }),
}));

afterEach(() => {
  mockUser = { id: 'test-user-id', email: 'test@example.com' };
  mockDemoView = 'off';
  mockIsMobile = false;
  mockIsSuperAdmin = false;
  mockConsumerThrows = false;
  mockEnterpriseThrows = false;
  mockEventsThrows = false;
  vi.clearAllMocks();
});

function renderMenu(
  props: Partial<React.ComponentProps<typeof SettingsMenu>> = {},
): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <SettingsMenu isOpen={true} onClose={vi.fn()} {...props} />
    </MemoryRouter>,
  );
}

describe('SettingsMenu hardening (never crash across modes)', () => {
  it('renders for an authenticated regular user (desktop)', () => {
    renderMenu();

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Consumer' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enterprise' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Events' })).toBeInTheDocument();
    expect(screen.getByTestId('consumer-settings')).toBeInTheDocument();
  });

  it('renders for an authenticated user (mobile) and shows account section', () => {
    mockIsMobile = true;
    renderMenu();

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Signed in as')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByTestId('consumer-settings')).toBeInTheDocument();
  });

  it('enables Advertiser access for super admins', () => {
    mockIsSuperAdmin = true;
    renderMenu();

    const advertiserButton = screen.getByRole('button', { name: 'Advertiser' });
    expect(advertiserButton).toBeInTheDocument();
    expect(advertiserButton).not.toBeDisabled();
  });

  it('keeps Advertiser disabled for regular users (non-app-preview)', () => {
    renderMenu();

    // Accessible name includes the "Soon" badge text (often ends up as "AdvertiserSoon").
    const advertiserButton = screen.getByRole('button', { name: /advertiser/i });
    expect(advertiserButton).toBeDisabled();
    expect(screen.getByText('Soon')).toBeInTheDocument();
  });

  it('renders even when logged out, as long as demoView is app-preview (mock demo user path)', () => {
    mockUser = null;
    mockDemoView = 'app-preview';
    renderMenu();

    // It should NOT show the login prompt; it should render the main settings UI.
    expect(screen.queryByText('Sign in to access settings')).not.toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByTestId('consumer-settings')).toBeInTheDocument();
  });

  it('renders the login prompt when logged out and demo is off (no crash)', () => {
    mockUser = null;
    mockDemoView = 'off';
    renderMenu();

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Sign in to access settings')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /log in \/ sign up/i })).toBeInTheDocument();
  });

  it('can mount directly into Enterprise and Events initial tabs without crashing', () => {
    renderMenu({ initialSettingsType: 'enterprise' });
    expect(screen.getByTestId('enterprise-settings')).toBeInTheDocument();

    renderMenu({ initialSettingsType: 'events' });
    expect(screen.getByTestId('events-settings')).toBeInTheDocument();
  });

  it('can switch between Consumer / Enterprise / Events tabs without crashing', async () => {
    const user = userEvent.setup();
    renderMenu();

    expect(screen.getByTestId('consumer-settings')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Enterprise' }));
    await waitFor(() => {
      expect(screen.getByTestId('enterprise-settings')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Events' }));
    await waitFor(() => {
      expect(screen.getByTestId('events-settings')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: 'Consumer' }));
    await waitFor(() => {
      expect(screen.getByTestId('consumer-settings')).toBeInTheDocument();
    });
  });

  it('does not take down Settings when a child panel crashes (Consumer)', () => {
    mockConsumerThrows = true;
    renderMenu();

    // Settings shell should still render.
    expect(screen.getByText('Settings')).toBeInTheDocument();

    // Compact error boundary content should appear instead of full-page crash.
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Please try again.')).toBeInTheDocument();
  });

  it('does not take down Settings when a child panel crashes (Enterprise + Events)', async () => {
    const user = userEvent.setup();
    renderMenu();

    mockEnterpriseThrows = true;
    await user.click(screen.getByRole('button', { name: 'Enterprise' }));
    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    mockEventsThrows = true;
    await user.click(screen.getByRole('button', { name: 'Events' }));
    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });
});
