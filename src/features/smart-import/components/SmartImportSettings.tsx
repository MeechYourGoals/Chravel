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
    } catch (error: any) {
      toast.error('Failed to load connected accounts', { description: error.message });
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
    } catch (error: any) {
      toast.error('Failed to initiate connection', { description: error.message });
      setConnecting(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    try {
      setDisconnectingId(accountId);
      await disconnectGmailAccount(accountId);
      toast.success('Gmail account disconnected');
      setAccounts(accounts.filter(a => a.id !== accountId));
    } catch (error: any) {
      toast.error('Failed to disconnect account', { description: error.message });
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
          Connect your Gmail account to enable Smart Import for flights, hotels, and events directly
          from your inbox.
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
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="h-4 w-4" />
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
                    <img
                      src="https://www.google.com/favicon.ico"
                      alt="Google"
                      className="h-5 w-5"
                    />
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
