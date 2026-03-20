import { supabase } from '@/integrations/supabase/client';

export type GmailAccount = {
  id: string;
  email: string;
  created_at: string;
  // token_expires_at: safe TIMESTAMPTZ (not a credential) — used to show reconnect UX
  // RLS on gmail_accounts_safe is row-scoped (auth.uid() = user_id); no token values exposed
  // migration 20260403000000_gmail_accounts_safe_with_status.sql adds these to the view
  token_expires_at: string | null;
  last_synced_at: string | null;
};

export const fetchGmailAccounts = async (): Promise<GmailAccount[]> => {
  try {
    // Query the safe view — token columns are not exposed to the frontend
    // token_expires_at and last_synced_at are timing hints, not credentials
    // RLS on gmail_accounts_safe is row-scoped (auth.uid() = user_id) — no cross-user data
    // These columns are added to the safe view by migration 20260403000000_gmail_accounts_safe_with_status
    // Cast needed: gmail_accounts_safe view may not be in generated Supabase types
    const { data, error } = await (
      supabase as unknown as { from: (table: string) => ReturnType<typeof supabase.from> }
    )
      .from('gmail_accounts_safe')
      .select('id, email, created_at, token_expires_at, last_synced_at')
      .order('created_at', { ascending: false });

    if (error) {
      // Graceful degradation if migration hasn't been applied yet
      if (
        error.message?.includes('schema cache') ||
        error.code === '42P01' ||
        error.message?.includes('gmail_accounts')
      ) {
        if (import.meta.env.DEV) {
          console.warn(
            '[gmailAuth] gmail_accounts_safe view not found — smart_import migration may not be applied yet',
          );
        }
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
    if (import.meta.env.DEV) {
      console.error('Error initiating Gmail connect:', error);
    }
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
    if (import.meta.env.DEV) {
      console.error('Error disconnecting Gmail account:', error);
    }
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
    if (import.meta.env.DEV) {
      console.error('Error completing Gmail connection:', error);
    }
    throw new Error(error.message);
  }

  return data;
};
