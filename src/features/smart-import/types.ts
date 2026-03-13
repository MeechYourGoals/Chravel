export interface SmartImportCandidate {
  id: string;
  reservation_data: Record<string, unknown>;
  status?: 'pending' | 'accepted' | 'rejected';
  created_at?: string;
  updated_at?: string;
}
