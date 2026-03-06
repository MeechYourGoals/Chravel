

## Problem

`src/features/smart-import/api/gmailAuth.ts` has a syntax error: a `catch` block on line 28 without a matching `try`. This breaks the entire build, preventing the preview from loading.

The `fetchGmailAccounts` function was likely meant to have a `try/catch` but the `try` keyword is missing. The arrow function opens at line 9, the `await` starts at line 10, but there's no `try {` wrapping lines 10-26 before the `catch` on line 28.

## Fix

Wrap the body of `fetchGmailAccounts` in a proper `try/catch`:

```typescript
export const fetchGmailAccounts = async (): Promise<GmailAccount[]> => {
  try {
    const { data, error } = await (supabase
      .from('gmail_accounts' as any)
      .select('id, email, created_at')
      .order('created_at', { ascending: false }) as any);

    if (error) {
      if (error.message?.includes('schema cache') || error.code === '42P01') {
        console.warn('[gmailAuth] gmail_accounts table not found');
        return [];
      }
      console.error('Error fetching Gmail accounts:', error);
      throw new Error(error.message);
    }

    return data || [];
  } catch (err) {
    if (err instanceof Error && err.message?.includes('schema cache')) {
      return [];
    }
    throw err;
  }
};
```

## Scope

- **1 file changed**: `src/features/smart-import/api/gmailAuth.ts`
- **Risk**: LOW — adds a missing `try` keyword, no logic change
- **No other files affected** — this is a self-contained syntax fix

The edge function error (`gmail-import-worker`) is a Deno-side type check issue and does not affect the frontend build or preview.

