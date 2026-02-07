/**
 * Type definitions for PDF Export
 */

export type ExportLayout = 'onepager' | 'pro';
export type ExportSection = 
  | 'calendar'
  | 'payments'
  | 'polls'
  | 'places'
  | 'tasks'
  | 'roster'
  | 'broadcasts'
  | 'attachments'
  | 'agenda'
  | 'lineup';

export interface Member {
  id: string;
  name: string;
  role?: string;
  dept?: string;
  email?: string;
  phone?: string;
}

export interface EventItem {
  dayLabel: string;
  time: string;
  title: string;
  location?: string;
  notes?: string;
  mapPreviewUrl?: string;
}

export interface PaymentSplit {
  name: string;
  owes: number;
  paid?: boolean;
  paid_at?: string | null;
}

export interface PaymentItem {
  title: string;
  payer: string;
  amount: number;
  currency: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  due?: string;
  split: PaymentSplit[];
}

export interface LinkItem {
  title: string;
  url: string;
  domain: string;
  category?: string;
  notes?: string;
}

export interface TaskItem {
  title: string;
  owner?: string;
  due?: string;
  status: 'Open' | 'In Progress' | 'Done' | 'Blocked';
}

export interface PollItem {
  question: string;
  options: {
    text: string;
    votes: number;
    winner?: boolean;
  }[];
}

export interface BroadcastItem {
  sender: string;
  ts: string;
  priority?: 'Low' | 'Normal' | 'High';
  message: string;
}

export interface AttachmentItem {
  /**
   * Display name shown in the recap body.
   * Typically the original filename (e.g. "MLB_Dodgers_Tickets.pdf").
   */
  name: string;
  /**
   * Best-effort mime/type label for display (e.g. "PDF", "Image", "DOCX").
   */
  type: string;
  /**
   * Optional uploader display name (not required for exports).
   * Never include email/phone (privacy rule).
   */
  uploaded_by?: string;
  /**
   * Human-readable upload date/time for display.
   */
  date?: string;

  /**
   * Storage path in the `trip-files` bucket (preferred for embedding).
   * Example: "<tripId>/<fileName>" or "<tripId>/files/<uuid>.pdf"
   */
  path?: string;
  /**
   * If present, a URL that can be shown on fallback pages.
   * Should be a signed URL for private buckets.
   */
  url?: string;
  /**
   * Raw mime type (e.g. "application/pdf") when available.
   */
  mime_type?: string;
  /**
   * Byte size when available (used for safeguards/logging).
   */
  size_bytes?: number;
}

export interface TripExportData {
  tripId: string;
  tripTitle: string;
  subtitle?: string;
  destination?: string;
  startDate: string;
  endDate: string;
  generatedAtLocal: string;
  layout: ExportLayout;
  privacyRedaction: boolean;
  totals?: {
    paymentsTotal?: number;
    currency?: string;
  };
  roster?: Member[];
  calendar?: EventItem[];
  payments?: PaymentItem[];
  polls?: PollItem[];
  tasks?: TaskItem[];
  places?: LinkItem[];
  broadcasts?: BroadcastItem[];
  attachments?: AttachmentItem[];
}

export interface ExportRequest {
  tripId: string;
  sections: ExportSection[];
  layout: ExportLayout;
  privacyRedaction: boolean;
  paper: 'letter' | 'a4';
}
