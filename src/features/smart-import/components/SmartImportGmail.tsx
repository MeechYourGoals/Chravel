import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
<<<<<<< HEAD
import { Loader2, Sparkles, AlertTriangle } from 'lucide-react';
=======
import { Loader2, Sparkles, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
>>>>>>> origin/main
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { fetchGmailAccounts, GmailAccount } from '../api/gmailAuth';
import { supabase } from '@/integrations/supabase/client';
import type { SmartImportCandidate, ImportPhase } from '../types';
import { IMPORT_PHASE_LABELS } from '../types';

export interface SmartImportGmailProps {
  tripId: string;
  onImportStarted?: () => void;
  onImportComplete?: (candidates: SmartImportCandidate[]) => void;
  onImportError?: (error: Error) => void;
}

const GmailIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    role="img"
    aria-label="Gmail"
  >
    <path d="M3.27 6.05A2 2 0 0 1 5 5h14a2 2 0 0 1 1.73 1.05L12 12.26 3.27 6.05Z" fill="#EA4335" />
    <path d="M3 6.78V18a2 2 0 0 0 2 2h2.25V10.4L3 6.78Z" fill="#34A853" />
    <path d="M21 6.78V18a2 2 0 0 1-2 2h-2.25V10.4L21 6.78Z" fill="#4285F4" />
    <path d="M7.25 20V9.75L12 13.4l4.75-3.65V20H7.25Z" fill="#FBBC04" />
  </svg>
);

<<<<<<< HEAD
=======
/** Phase step indicator for the import pipeline */
const ImportPhaseIndicator: React.FC<{ phase: ImportPhase }> = ({ phase }) => {
  const steps: { key: ImportPhase; label: string }[] = [
    { key: 'parsing', label: 'Scanning' },
    { key: 'validating', label: 'Validating' },
    { key: 'importing', label: 'Importing' },
    { key: 'done', label: 'Done' },
  ];

  const currentIndex = steps.findIndex(s => s.key === phase);
  const isFailed = phase === 'failed';

  return (
    <div
      className="space-y-2"
      role="progressbar"
      aria-label="Import progress"
      aria-valuenow={currentIndex + 1}
      aria-valuemax={steps.length}
    >
      <p className="text-sm font-medium text-center">{IMPORT_PHASE_LABELS[phase]}</p>
      <div className="flex items-center gap-1">
        {steps.map((step, idx) => {
          const isComplete = !isFailed && currentIndex > idx;
          const isCurrent = !isFailed && currentIndex === idx;
          const isFailedStep = isFailed && idx === currentIndex;

          return (
            <React.Fragment key={step.key}>
              <div className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`h-2 w-full rounded-full transition-colors ${
                    isComplete
                      ? 'bg-green-500'
                      : isCurrent
                        ? 'bg-primary animate-pulse'
                        : isFailedStep
                          ? 'bg-red-500'
                          : 'bg-muted'
                  }`}
                />
                <span
                  className={`text-[10px] ${isCurrent ? 'text-primary font-medium' : 'text-muted-foreground'}`}
                >
                  {step.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

>>>>>>> origin/main
export const SmartImportGmail: React.FC<SmartImportGmailProps> = ({
  tripId,
  onImportStarted,
  onImportComplete,
  onImportError,
}) => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<GmailAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [importPhase, setImportPhase] = useState<ImportPhase>('idle');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await fetchGmailAccounts();
      setAccounts(data);
      if (data.length > 0) {
        setSelectedAccountId(data[0].id);
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Failed to load accounts', error);
      }
      toast.error('Failed to load Gmail accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedAccountId) return;

    setImporting(true);
    setTokenExpired(false);
    setImportPhase('parsing');
    onImportStarted?.();

    try {
      setImportPhase('validating');
      const { data, error } = await supabase.functions.invoke('gmail-import-worker', {
        body: { tripId, accountId: selectedAccountId },
      });

      if (error) throw new Error(error.message);

      // Detect token expired error returned as a 401 payload
      if (data?.error && /token expired|reconnect/i.test(data.error)) {
        setImportPhase('failed');
        setTokenExpired(true);
        onImportError?.(new Error(data.error));
        return;
      }

      setImportPhase('importing');
      const candidates = (data.candidates || []) as SmartImportCandidate[];

      setImportPhase('done');
      toast.success(
        candidates.length > 0
          ? `Found ${candidates.length} item${candidates.length !== 1 ? 's' : ''} in your inbox`
          : 'Inbox scan complete — no new items found',
      );
      onImportComplete?.(candidates);
    } catch (error: unknown) {
      setImportPhase('failed');
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      const isTokenError = /token expired|reconnect|unauthorized/i.test(errMsg);
      if (isTokenError) {
        setTokenExpired(true);
      } else {
        toast.error('Failed to import from Gmail', { description: errMsg });
      }
      onImportError?.(error instanceof Error ? error : new Error(errMsg));
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center" role="status" aria-label="Loading Gmail accounts">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-4 rounded-lg border border-dashed bg-muted/50 text-center space-y-3">
        <GmailIcon className="h-6 w-6 opacity-90" />
        <p className="text-sm font-medium">No Gmail account connected.</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          Connect your Gmail in Settings to find flights, hotels, transport, dining, and ticketed
          events for this trip.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px]"
          aria-label="Navigate to settings to connect Gmail"
          onClick={() => navigate('/settings', { state: { section: 'integrations' } })}
        >
          Go to Settings
        </Button>
      </div>
    );
  }

  // Token expired — show reconnect prompt instead of the scan UI
  if (tokenExpired) {
    return (
      <div className="flex flex-col items-center justify-center p-4 rounded-lg border border-dashed border-amber-500/40 bg-amber-500/5 text-center space-y-3">
        <AlertTriangle className="h-6 w-6 text-amber-500" />
        <p className="text-sm font-medium">Gmail connection expired</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          Your Gmail access has expired or been revoked. Reconnect to continue scanning your inbox.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px]"
          aria-label="Navigate to settings to reconnect Gmail"
          onClick={() => navigate('/settings', { state: { section: 'integrations' } })}
        >
          Reconnect Gmail
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GmailIcon className="h-5 w-5" />
            <h4 className="font-medium text-sm">Smart Import from Gmail</h4>
            <Sparkles className="h-3 w-3 text-yellow-500" />
          </div>
          <p className="text-xs text-muted-foreground max-w-[280px]">
            We'll securely scan your inbox for recent travel reservations matching this trip's
            dates.
          </p>
        </div>
      </div>

      {/* Import phase indicator — visible during scanning */}
      {importing && importPhase !== 'idle' && <ImportPhaseIndicator phase={importPhase} />}

      {/* Import result indicators */}
      {!importing && importPhase === 'done' && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4" />
          <span>Scan complete</span>
        </div>
      )}
      {!importing && importPhase === 'failed' && !tokenExpired && (
        <div className="flex items-center gap-2 text-sm text-red-500">
          <XCircle className="h-4 w-4" />
          <span>Import failed — try again</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger className="h-11 min-h-[44px]" aria-label="Select Gmail account">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map(account => (
                <SelectItem key={account.id} value={account.id}>
                  {account.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={handleImport}
          disabled={!selectedAccountId || importing}
          className="bg-blue-600 hover:bg-blue-700 h-11 min-h-[44px]"
          aria-label={importing ? 'Scanning inbox' : 'Scan inbox for travel reservations'}
        >
          {importing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scanning...
            </>
          ) : (
            'Scan Inbox'
          )}
        </Button>
      </div>
    </div>
  );
};
