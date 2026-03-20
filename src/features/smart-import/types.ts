/** State machine phases for the Smart Import pipeline */
export type ImportPhase = 'idle' | 'parsing' | 'validating' | 'importing' | 'done' | 'failed';

/** Human-readable labels for each import phase */
export const IMPORT_PHASE_LABELS: Record<ImportPhase, string> = {
  idle: 'Ready',
  parsing: 'Parsing items…',
  validating: 'Validating data…',
  importing: 'Importing to trip…',
  done: 'Complete',
  failed: 'Import failed',
};

export interface SmartImportCandidate {
  id: string;
  reservation_data: ReservationData;
  status?: 'pending' | 'accepted' | 'rejected';
  source?: 'gmail' | 'file' | 'url' | 'text';
  error_message?: string;
  retry_count?: number;
  created_at?: string;
  updated_at?: string;
}

/** Typed reservation data extracted from Gmail or file import */
export interface ReservationData {
  type?: string;
  is_cancellation?: boolean;
  is_modification?: boolean;
  _relevance_score?: number;
  _relevance_reason?: string;
  _gmail_message_id?: string;
  _email_subject?: string;
  confirmation_code?: string;
  /** Flight-specific fields */
  airline_name?: string;
  booking_source?: string;
  airline_code?: string;
  flight_number?: string;
  tail_number?: string;
  departure_city?: string;
  departure_airport_code?: string;
  arrival_city?: string;
  arrival_airport_code?: string;
  /** Lodging-specific fields */
  property_name?: string;
  city?: string;
  address?: string;
  /** Transport-specific fields */
  provider_name?: string;
  pickup_location?: string;
  dropoff_location?: string;
  /** Event-specific fields */
  event_name?: string;
  venue_name?: string;
  /** Restaurant-specific fields */
  restaurant_name?: string;
  /** Rail/Bus/Ferry-specific fields */
  departure_location?: string;
  arrival_location?: string;
  /** Generic itinerary fields */
  item_label?: string;
  location?: string;
  /** Allow additional dynamic fields from the extraction pipeline */
  [key: string]: unknown;
}

/** Tracks progress during batch import of candidates */
export interface ImportProgress {
  phase: ImportPhase;
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  /** IDs of candidates that failed and can be retried */
  failedCandidateIds: string[];
}

/** Per-candidate import result for partial failure tracking */
export interface CandidateImportResult {
  candidateId: string;
  status: 'succeeded' | 'failed';
  errorMessage?: string;
}

/** Supported file formats for Smart Import */
export const SUPPORTED_IMPORT_FORMATS = [
  { extension: '.ics', label: 'Calendar (ICS)' },
  { extension: '.csv', label: 'Spreadsheet (CSV)' },
  { extension: '.xls', label: 'Excel (XLS)' },
  { extension: '.xlsx', label: 'Excel (XLSX)' },
  { extension: '.pdf', label: 'PDF Document' },
  { extension: '.jpg', label: 'JPEG Image' },
  { extension: '.jpeg', label: 'JPEG Image' },
  { extension: '.png', label: 'PNG Image' },
  { extension: '.webp', label: 'WebP Image' },
  { extension: '.txt', label: 'Text File' },
  { extension: '.gif', label: 'GIF Image' },
] as const;

/** Get human-readable label for a file extension */
export function getFormatLabel(fileName: string): string | null {
  const ext = '.' + (fileName.split('.').pop()?.toLowerCase() ?? '');
  const format = SUPPORTED_IMPORT_FORMATS.find(f => f.extension === ext);
  return format?.label ?? null;
}

/** Check if a file extension is supported */
export function isFormatSupported(fileName: string): boolean {
  return getFormatLabel(fileName) !== null;
}
