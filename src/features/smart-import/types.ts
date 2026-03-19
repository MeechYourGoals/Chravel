export interface SmartImportCandidate {
  id: string;
  reservation_data: Record<string, unknown>;
  status?: 'pending' | 'accepted' | 'rejected';
  source?: 'gmail' | 'file' | 'url' | 'text';
  error_message?: string;
  retry_count?: number;
  created_at?: string;
  updated_at?: string;
}

/** Tracks progress during batch import of candidates */
export interface ImportProgress {
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  /** IDs of candidates that failed and can be retried */
  failedCandidateIds: string[];
}
