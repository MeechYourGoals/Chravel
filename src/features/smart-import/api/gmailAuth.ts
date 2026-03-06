import { supabase } from '@/integrations/supabase/client';

export type GmailAccount = {
  id: string;
  email: string;
  created_at: string;
};

export const fetchGmailAccounts = async (): Promise<GmailAccount[]> => {
  try {
    const { data, error } = await supabase
      .from('gmail_accounts')
      .select('id, email, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      // Gracefully handle missing table (migration not yet applied)
      if (error.message?.includes('schema cache') || error.code === '42P01') {
        console.warn(
          '[gmailAuth] gmail_accounts table not found - migration may not be applied yet',
        );
        return [];
      }
      console.error('Error fetching Gmail accounts:', error);
      throw new Error(error.message);
    }

    return data || [];
  } catch (err) {
    // Catch network or unexpected errors gracefully
    if (err instanceof Error && err.message?.includes('schema cache')) {
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
