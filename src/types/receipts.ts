export interface ParsedReceiptData {
  vendor?: string;
  date?: string;
  items?: Array<{
    name: string;
    quantity?: number;
    price?: number;
  }>;
  subtotal?: number;
  tax?: number;
  tip?: number;
  total?: number;
  paymentMethod?: string;
  confidence?: number;
}

export interface Receipt {
  id: string;
  tripId: string;
  uploaderId: string;
  uploaderName?: string;
  fileUrl: string;
  totalAmount: number | null;
  currency: string | null;
  parsedData?: ParsedReceiptData;
  preferredMethod: 'venmo' | 'cashapp' | 'zelle' | 'paypal' | 'applecash';
  splitCount?: number;
  perPersonAmount?: number;
  createdAt: string;
}

export interface ReceiptUpload {
  file: File;
  totalAmount: number;
  currency: string;
  preferredMethod: 'venmo' | 'cashapp' | 'zelle' | 'paypal' | 'applecash';
  splitCount?: number;
}

export type PaymentMethod = 'venmo' | 'cashapp' | 'zelle' | 'paypal' | 'applecash';
