/**
 * Type definitions for PDF Export
 */

export type ExportLayout = 'onepager' | 'ops';
export type ExportSection = 
  | 'calendar'
  | 'payments'
  | 'polls'
  | 'places'
  | 'tasks'
  | 'roster'
  | 'broadcasts'
  | 'attachments';

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
  qrSvg?: string;
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
  ts: string;
  priority?: 'Low' | 'Normal' | 'High';
  message: string;
  readRate?: string;
}

export interface AttachmentItem {
  name: string;
  type: string;
  uploaded_by?: string;
  date?: string;
}

export interface TripExportData {
  tripId: string;
  tripTitle: string;
  subtitle?: string;
  destination?: string;
  startDate: string;
  endDate: string;
  coverImageUrl?: string;
  deeplinkQrSvg: string;
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
