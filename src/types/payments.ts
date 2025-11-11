// Payment & Settlement Types (Extended)

import { PaymentMethodId } from './paymentMethods';
import { Receipt } from './receipts';

// PaymentMethod structure used throughout the app
export interface PaymentMethod {
  id: string;
  type: PaymentMethodId | 'venmo' | 'zelle' | 'cashapp' | 'applepay' | 'paypal' | 'applecash' | 'cash' | 'other';
  method_type?: string; // Database field
  identifier: string;
  displayName?: string;
  display_name?: string; // Database field
  isPreferred?: boolean;
  is_preferred?: boolean; // Database field
  isVisible?: boolean;
}

// PaymentMessage structure for trip payments
export interface PaymentMessage {
  id: string;
  tripId: string;
  messageId: string | null;
  amount: number;
  currency: string;
  description: string;
  splitCount: number;
  splitParticipants: string[];
  paymentMethods: string[];
  createdBy: string;
  createdAt: string;
  isSettled: boolean;
}

export interface PaymentParticipant {
  userId: string;
  name: string;
  avatar?: string;
  amount: number;
  paid: boolean;
  paidAt?: string;
  paymentMethod?: PaymentMethod;
  confirmationStatus?: 'none' | 'pending' | 'confirmed';
  confirmedBy?: string;
  confirmedAt?: string;
}

export interface PaymentSplit {
  id: string;
  tripId: string;
  createdBy: string;
  createdByName: string;
  amount: number;
  currency: string;
  description: string;
  category?: string;
  
  // Split details
  splitType: 'equal' | 'custom' | 'percentage';
  participants: PaymentParticipant[];
  totalParticipants: number;
  
  // Settlement
  settled: boolean;
  settledAt?: string;
  
  // Receipt
  receiptUrl?: string;
  receiptId?: string;
  receipt?: Receipt;
  
  // Payment methods
  preferredMethods: PaymentMethod[];
  
  // Metadata
  notes?: string;
  tags?: string[];
  location?: string;
  timestamp: string;
  
  // Audit
  version: number;
  lastModified: string;
}

export interface PaymentSummary {
  tripId: string;
  totalSpent: number;
  totalOwed: number;
  totalOwedToYou: number;
  totalYouOwe: number;
  currency: string;
  
  // Breakdown by user
  balances: Array<{
    userId: string;
    userName: string;
    balance: number; // positive = they owe you, negative = you owe them
  }>;
  
  // Category breakdown
  categories: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;
}

export interface PaymentRequest {
  tripId: string;
  amount: number;
  currency: string;
  description: string;
  participants: string[]; // user IDs
  splitType: 'equal' | 'custom' | 'percentage';
  customAmounts?: Record<string, number>; // userId -> amount
  preferredMethod?: PaymentMethod;
  receiptUrl?: string;
  category?: string;
  notes?: string;
}

export interface SettlementSuggestion {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
  currency: string;
  method?: PaymentMethod;
}

export interface PaymentData {
  amount: number;
  currency: string;
  description: string;
  splitCount: number;
  settled?: boolean;
  participants?: PaymentParticipant[];
  methods?: PaymentMethod[];
}

// Personal Balance with currency support
export interface PersonalBalance {
  userId: string;
  userName: string;
  avatar: string;
  amountOwed: number;
  amountOwedCurrency: string; // Currency code (e.g., 'USD')
  preferredPaymentMethod: any;
  unsettledPayments: any[];
}

// Balance Summary with base currency
export interface BalanceSummary {
  totalOwed: number;
  totalOwedToYou: number;
  netBalance: number;
  baseCurrency: string; // Base currency for calculations
  balances: PersonalBalance[];
}
