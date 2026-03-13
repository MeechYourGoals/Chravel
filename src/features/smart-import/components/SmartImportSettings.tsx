import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Mail, Trash2 } from 'lucide-react';
import {
  fetchGmailAccounts,
  connectGmailAccount,
  disconnectGmailAccount,
  GmailAccount,
} from '../api/gmailAuth';

/** Official Google "G" logo as inline SVG — no external image dependency */
const GoogleLogo: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export const SmartImportSettings = () => {
  const [accounts, setAccounts] = useState<GmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await fetchGmailAccounts();
      setAccounts(data);
    } catch (error: unknown) {
      toast.error('Failed to load connected accounts', { description: (error as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      const url = await connectGmailAccount();
      // Redirect to Google OAuth consent screen
      window.location.href = url;
    } catch (error: unknown) {
      toast.error('Failed to initiate connection', { description: (error as Error)?.message });
      setConnecting(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    try {
      setDisconnectingId(accountId);
      await disconnectGmailAccount(accountId);
      toast.success('Gmail account disconnected');
      setAccounts(accounts.filter(a => a.id !== accountId));
    } catch (error: unknown) {
      toast.error('Failed to disconnect account', { description: (error as Error)?.message });
    } finally {
      setDisconnectingId(null);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-xl flex items-center gap-2">
          <Mail className="h-5 w-5 text-blue-500" />
          Connected Integrations
        </CardTitle>
        <CardDescription>
          Connect your Gmail account to enable Smart Import for flights, hotels, rentals,
          restaurants, and tickets directly from your inbox.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0 space-y-4">
        {loading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center bg-card">
            <div className="flex flex-col items-center gap-2">
              <Mail className="h-8 w-8 text-muted-foreground mb-2" />
              <h3 className="font-medium">No Gmail accounts connected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect an account to seamlessly import travel plans.
              </p>
              <Button
                onClick={handleConnect}
                disabled={connecting}
                variant="outline"
                className="gap-2"
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <GoogleLogo className="h-4 w-4" />
                )}
                Connect Gmail
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {accounts.map(account => (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-lg border p-4 bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <GoogleLogo className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{account.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Connected {new Date(account.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => handleDisconnect(account.id)}
                  disabled={disconnectingId === account.id}
                >
                  {disconnectingId === account.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
            <Button
              onClick={handleConnect}
              disabled={connecting}
              variant="outline"
              className="w-full gap-2"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Connect another account
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
