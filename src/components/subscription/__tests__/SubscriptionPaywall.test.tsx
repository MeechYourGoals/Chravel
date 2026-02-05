import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock safeReload
vi.mock('@/utils/safeReload', () => ({
  safeReload: vi.fn().mockResolvedValue(undefined),
}));

// Mock RevenueCat
const mockGetCustomerInfo = vi.fn();
const mockGetOfferings = vi.fn();
const mockPurchase = vi.fn();

vi.mock('@revenuecat/purchases-js', () => ({
  Purchases: {
    getSharedInstance: () => ({
      getCustomerInfo: mockGetCustomerInfo,
      getOfferings: mockGetOfferings,
      purchase: mockPurchase,
    }),
  },
  ErrorCode: {
    UserCancelledError: 1,
  },
  PurchasesError: class PurchasesError extends Error {
    errorCode: number;
    constructor(message: string, errorCode: number) {
      super(message);
      this.errorCode = errorCode;
    }
  },
}));

import { SubscriptionPaywall } from '../SubscriptionPaywall';

describe('SubscriptionPaywall', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: not entitled, offerings available
    mockGetCustomerInfo.mockResolvedValue({
      entitlements: { active: {} },
    });
    mockGetOfferings.mockResolvedValue({
      current: null,
      all: {},
    });
  });

  it('should render loading state initially', () => {
    render(<SubscriptionPaywall />);
    expect(screen.getByText('Loading subscription options...')).toBeInTheDocument();
  });

  it('should render error state when no offerings are available', async () => {
    mockGetCustomerInfo.mockResolvedValue({
      entitlements: { active: {} },
    });
    mockGetOfferings.mockResolvedValue({
      current: null,
      all: {},
    });

    render(<SubscriptionPaywall />);

    // Wait for loading to finish
    const errorText = await screen.findByText('No subscription packages available');
    expect(errorText).toBeInTheDocument();
  });

  it('should render subscribed view when user is entitled', async () => {
    mockGetCustomerInfo.mockResolvedValue({
      entitlements: {
        active: {
          pro: { isActive: true },
        },
      },
    });
    mockGetOfferings.mockResolvedValue({
      current: { availablePackages: [] },
      all: {},
    });

    render(<SubscriptionPaywall entitlementId="pro" />);

    const subscribedText = await screen.findByText("You're Subscribed!");
    expect(subscribedText).toBeInTheDocument();
  });

  it('should call onClose when Continue button clicked in subscribed view', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    mockGetCustomerInfo.mockResolvedValue({
      entitlements: {
        active: {
          pro: { isActive: true },
        },
      },
    });
    mockGetOfferings.mockResolvedValue({
      current: { availablePackages: [] },
      all: {},
    });

    render(<SubscriptionPaywall entitlementId="pro" onClose={onClose} />);

    const continueButton = await screen.findByText('Continue');
    await user.click(continueButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('should show Unlock Premium header', () => {
    render(<SubscriptionPaywall />);
    expect(screen.getByText('Unlock Premium')).toBeInTheDocument();
  });

  it('should show feature list after loading', async () => {
    // Mock successful offerings with a package
    mockGetCustomerInfo.mockResolvedValue({
      entitlements: { active: {} },
    });
    mockGetOfferings.mockResolvedValue({
      current: {
        availablePackages: [
          {
            identifier: 'monthly',
            packageType: '$rc_monthly',
            webBillingProduct: {
              title: 'Monthly',
              price: { formattedPrice: '$9.99', amountMicros: 9990000 },
              description: 'Monthly subscription',
              period: { unit: 'month' },
            },
          },
        ],
        monthly: null,
        annual: null,
      },
      all: {},
    });

    render(<SubscriptionPaywall />);

    // Wait for features to appear after loading finishes
    const feature = await screen.findByText('Unlimited trip creation');
    expect(feature).toBeInTheDocument();
    expect(screen.getByText('AI-powered travel concierge')).toBeInTheDocument();
    expect(screen.getByText('Advanced budget tracking')).toBeInTheDocument();
    expect(screen.getByText('Priority support')).toBeInTheDocument();
    expect(screen.getByText('No ads')).toBeInTheDocument();
  });

  it('should render close button when onClose is provided', () => {
    render(<SubscriptionPaywall onClose={vi.fn()} />);
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });

  it('should show Try Again button when error occurs and call safeReload', async () => {
    const user = userEvent.setup();

    mockGetCustomerInfo.mockRejectedValue(new Error('Network error'));

    render(<SubscriptionPaywall />);

    const tryAgainButton = await screen.findByText('Try Again');
    expect(tryAgainButton).toBeInTheDocument();

    const { safeReload } = await import('@/utils/safeReload');
    await user.click(tryAgainButton);
    expect(safeReload).toHaveBeenCalled();
  });
});
