import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mail, Check, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
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

export interface SmartImportGmailProps {
  tripId: string;
  onImportStarted?: () => void;
  onImportComplete?: (candidates: any[]) => void;
  onImportError?: (error: Error) => void;
}

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
      console.error('Failed to load accounts', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedAccountId) return;

    setImporting(true);
    onImportStarted?.();

    try {
      const { data, error } = await supabase.functions.invoke('gmail-import-worker', {
        body: { tripId, accountId: selectedAccountId },
      });

      if (error) throw new Error(error.message);

      toast.success('Successfully scanned inbox');
      onImportComplete?.(data.candidates || []);
    } catch (error: any) {
      toast.error('Failed to import from Gmail', { description: error.message });
      onImportError?.(error);
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-4 rounded-lg border border-dashed bg-muted/50 text-center space-y-3">
        <Mail className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">No Gmail account connected.</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          Connect your Gmail in Settings to magically find flights, hotels, and event tickets for
          this trip.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/settings', { state: { section: 'integrations' } })}>
          Go to Settings
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-500" />
            <h4 className="font-medium text-sm">Smart Import from Gmail</h4>
            <Sparkles className="h-3 w-3 text-yellow-500" />
          </div>
          <p className="text-xs text-muted-foreground max-w-[280px]">
            We'll securely scan your inbox for recent travel reservations matching this trip's
            dates.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
            <SelectTrigger className="h-9">
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
          className="bg-blue-600 hover:bg-blue-700 h-9"
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
