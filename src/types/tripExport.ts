/**
 * Trip Executive Summary Export Types
 *
 * Defines interfaces for exporting trip data sections to PDF
 */

import { Database } from '@/integrations/supabase/types';

export type TripEvent = Database['public']['Tables']['trip_events']['Row'];
export type TripPayment = Database['public']['Tables']['trip_payment_messages']['Row'];
export type TripPoll = Database['public']['Tables']['trip_polls']['Row'];
export type TripLink = Database['public']['Tables']['trip_links']['Row'];
export type TripTask = Database['public']['Tables']['trip_tasks']['Row'];
export type Trip = Database['public']['Tables']['trips']['Row'];

/**
 * Available sections for export
 */
export type ExportSection = 
  | 'calendar' 
  | 'payments' 
  | 'polls' 
  | 'places' 
  | 'tasks'
  | 'roster'
  | 'broadcasts'
  | 'attachments';

/**
 * Request payload for trip export
 */
export interface TripExportRequest {
  tripId: string;
  includeSections: ExportSection[];
}

/**
 * Response from export API
 */
export interface TripExportResponse {
  success: boolean;
  pdfUrl?: string;
  pdfBase64?: string;
  error?: string;
}

/**
 * Formatted section data for PDF generation
 */
export interface FormattedCalendarSection {
  type: 'calendar';
  title: string;
  icon: string;
  items: {
    title: string;
    date: string;
    time?: string;
    location?: string;
    description?: string;
  }[];
}

export interface FormattedPaymentsSection {
  type: 'payments';
  title: string;
  icon: string;
  items: {
    description: string;
    amount: string;
    currency: string;
    payer: string;
    participants: number;
    settled: boolean;
    date: string;
  }[];
  totalAmount?: string;
}

export interface FormattedPollsSection {
  type: 'polls';
  title: string;
  icon: string;
  items: {
    question: string;
    options: {
      text: string;
      votes: number;
      percentage: number;
    }[];
    totalVotes: number;
    status: string;
    winner?: string;
  }[];
}

export interface FormattedPlacesSection {
  type: 'places';
  title: string;
  icon: string;
  items: {
    name: string;
    url: string;
    description?: string;
    category?: string;
    votes: number;
  }[];
}

export interface FormattedTasksSection {
  type: 'tasks';
  title: string;
  icon: string;
  items: {
    title: string;
    description?: string;
    completed: boolean;
    dueDate?: string;
    completedDate?: string;
  }[];
  stats: {
    total: number;
    completed: number;
    pending: number;
  };
}

export type FormattedSection =
  | FormattedCalendarSection
  | FormattedPaymentsSection
  | FormattedPollsSection
  | FormattedPlacesSection
  | FormattedTasksSection;

/**
 * Complete trip export data structure
 */
export interface TripExportData {
  trip: {
    name: string;
    description?: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    coverImageUrl?: string;
  };
  sections: FormattedSection[];
  metadata: {
    exportedAt: string;
    exportedBy: string;
    generatedBy: string;
  };
}

/**
 * Poll option structure (from JSON field)
 */
export interface PollOption {
  id: string;
  text: string;
  votes?: number;
}
