import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { handleGmailCallback } from '../features/smart-import/api/gmailAuth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const GmailCallbackPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError(`Google returned an error: ${errorParam}`);
      toast.error('Failed to connect Gmail');
      // Redirect back to settings after a delay
      setTimeout(() => navigate('/settings', { state: { section: 'integrations' } }), 3000);
      return;
    }

    if (!code || !state) {
      setError('Invalid callback parameters');
      toast.error('Invalid callback parameters');
      setTimeout(() => navigate('/settings', { state: { section: 'integrations' } }), 3000);
      return;
    }

    const processCallback = async () => {
      try {
        const { email } = await handleGmailCallback(code, state);
        toast.success(`Successfully connected ${email}`);
        navigate('/settings', { state: { section: 'integrations' } });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to complete Gmail connection');
        toast.error('Failed to complete Gmail connection');
        setTimeout(() => navigate('/settings', { state: { section: 'integrations' } }), 3000);
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-4">
      <div className="max-w-md text-center space-y-4">
        {error ? (
          <>
            <div className="text-destructive font-medium text-lg">Connection Failed</div>
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm">Redirecting back to settings...</p>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-medium">Connecting your Gmail account...</h2>
            <p className="text-muted-foreground">
              Please wait while we securely complete the setup.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
