/**
 * Hook for GDPR Data Export functionality
 *
 * Provides methods to request and download user data exports.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface DataExportResult {
  success: boolean;
  message: string;
  downloadUrl?: string;
  expiresAt?: string;
  expiresInMinutes?: number;
  filename?: string;
  totalRecords?: number;
  fileSizeBytes?: number;
  tablesExported?: number;
}

export interface DataExportError {
  error: string;
  message?: string;
  retryAfter?: number;
}

export type DataExportStatus = 'idle' | 'loading' | 'success' | 'error' | 'rate_limited';

export function useDataExport() {
  const { user } = useAuth();
  const [status, setStatus] = useState<DataExportStatus>('idle');
  const [result, setResult] = useState<DataExportResult | null>(null);
  const [error, setError] = useState<DataExportError | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const requestExport = useCallback(async (): Promise<DataExportResult | null> => {
    if (!user) {
      setError({
        error: 'Not authenticated',
        message: 'You must be logged in to export your data.',
      });
      setStatus('error');
      return null;
    }

    setIsExporting(true);
    setStatus('loading');
    setError(null);
    setResult(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error('No valid session found');
      }

      const response = await supabase.functions.invoke('export-user-data', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      const data = response.data as DataExportResult | DataExportError;

      // Check for rate limit error
      if ('retryAfter' in data && data.retryAfter) {
        setError(data as DataExportError);
        setStatus('rate_limited');
        return null;
      }

      // Check for other errors
      if ('error' in data && !('success' in data)) {
        setError(data as DataExportError);
        setStatus('error');
        return null;
      }

      // Success
      const exportResult = data as DataExportResult;
      setResult(exportResult);
      setStatus('success');
      return exportResult;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export data';
      setError({ error: errorMessage });
      setStatus('error');
      return null;
    } finally {
      setIsExporting(false);
    }
  }, [user]);

  const downloadExport = useCallback((downloadUrl: string, filename: string) => {
    // Create a temporary link to trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  return {
    status,
    result,
    error,
    isExporting,
    requestExport,
    downloadExport,
    reset,
  };
}
