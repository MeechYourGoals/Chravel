import { supabase } from '@/integrations/supabase/client';

export type GmailAccount = {
  id: string;
  email: string;
  created_at: string;
  last_synced_at: string | null;
};

export const fetchGmailAccounts = async (): Promise<GmailAccount[]> => {
  try {
    // Query the safe view — token columns are not exposed to the frontend
    // Cast to 'any' because gmail_accounts_safe view may not be in generated types
    const { data, error } = await (supabase as any)
      .from('gmail_accounts_safe')
      .select('id, email, created_at, last_synced_at')
      .order('created_at', { ascending: false });

    if (error) {
      // Graceful degradation if migration hasn't been applied yet
      if (
        error.message?.includes('schema cache') ||
        error.code === '42P01' ||
        error.message?.includes('gmail_accounts')
      ) {
        console.warn(
          '[gmailAuth] gmail_accounts_safe view not found — smart_import migration may not be applied yet',
        );
        return [];
      }
      throw new Error(error.message);
    }

    return (data || []) as GmailAccount[];
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message?.includes('schema cache') || err.message?.includes('gmail_accounts'))
    ) {
      return [];
    }
    throw err;
  }
};

export const connectGmailAccount = async (): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('gmail-auth/connect', {
    method: 'POST',
  });

  if (error) {
    console.error('Error initiating Gmail connect:', error);
    throw new Error(error.message);
  }

  return data.url;
};

export const disconnectGmailAccount = async (accountId: string): Promise<void> => {
  const { error } = await supabase.functions.invoke('gmail-auth/disconnect', {
    method: 'POST',
    body: { accountId },
  });

  if (error) {
    console.error('Error disconnecting Gmail account:', error);
    throw new Error(error.message);
  }
};

export const handleGmailCallback = async (
  code: string,
  state: string,
): Promise<{ success: boolean; email?: string }> => {
  const { data, error } = await supabase.functions.invoke('gmail-auth/callback', {
    method: 'POST',
    body: { code, state },
  });

  if (error) {
    console.error('Error completing Gmail connection:', error);
    throw new Error(error.message);
  }

  return data;
};
