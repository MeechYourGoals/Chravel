# Secure Storage Access Guide

## Overview

The `secure_storage` table stores highly sensitive encrypted data (API keys, credentials, etc.) and requires additional security layers beyond basic authentication. This document explains how to implement secure access to this table.

## Security Requirements

Access to `secure_storage` requires:

1. **Recent Authentication**: User must have authenticated within the last 15 minutes OR have an active verification session
2. **MFA Verification**: If MFA is enabled, user must have completed MFA verification within the last 15 minutes
3. **Verification Session**: After password/MFA verification, a verification session must be created to grant access

## Implementation

### Step 1: Create Verification Session After Authentication

After a user successfully authenticates (password or MFA), call the verification endpoint:

```typescript
import { supabase } from '@/integrations/supabase/client';
import { SecureStorageHelper } from '@/utils/securityUtils';

// After successful password/MFA authentication
const sessionResult = await SecureStorageHelper.createVerificationSession(
  supabase,
  'password', // or 'mfa' or 'biometric'
  15 // session duration in minutes (default: 15, max: 60)
);

if (sessionResult.success) {
  console.log('Verification session created:', sessionResult.sessionId);
  console.log('Expires at:', sessionResult.expiresAt);
} else {
  console.error('Failed to create session:', sessionResult.error);
}
```

### Step 2: Access Secure Storage

Use the helper function to access secure_storage with automatic session management:

```typescript
import { SecureStorageHelper } from '@/utils/securityUtils';
import { supabase } from '@/integrations/supabase/client';

// Example: Reading from secure_storage
const result = await SecureStorageHelper.withSecureStorageAccess(
  supabase,
  async () => {
    const { data, error } = await supabase
      .from('secure_storage')
      .select('*')
      .eq('key', 'api_key');
    
    if (error) throw error;
    return data;
  },
  async () => {
    // Callback when re-authentication is required
    // Redirect to login or show re-authentication modal
    console.log('Re-authentication required');
    // Example: router.push('/re-authenticate');
  }
);

if (result.success) {
  console.log('Secure data:', result.data);
} else if (result.requiresReauth) {
  // Handle re-authentication requirement
  console.log('Please re-authenticate to access secure storage');
} else {
  console.error('Error:', result.error);
}
```

### Step 3: Direct Access (Manual Session Management)

If you prefer manual session management:

```typescript
import { supabase } from '@/integrations/supabase/client';

// 1. Create verification session first
const { data: sessionData, error: sessionError } = await supabase.functions.invoke('verify-identity', {
  body: {
    verification_method: 'password',
    session_duration_minutes: 15,
  },
});

if (sessionError) {
  console.error('Failed to create verification session:', sessionError);
  return;
}

// 2. Now access secure_storage (session is valid for 15 minutes)
const { data, error } = await supabase
  .from('secure_storage')
  .select('*')
  .eq('key', 'api_key');

if (error) {
  console.error('Access denied:', error);
  // May need to create a new verification session
}
```

## Edge Function API

### POST `/verify-identity`

Creates a verification session after successful authentication.

**Request Body:**
```json
{
  "verification_method": "password" | "mfa" | "biometric",
  "session_duration_minutes": 15  // Optional, default: 15, max: 60
}
```

**Response:**
```json
{
  "success": true,
  "session_id": "uuid",
  "expires_at": "2025-01-25T12:00:00Z",
  "message": "Identity verification session created successfully"
}
```

## Database Functions

### `has_recent_authentication(user_id, max_age_minutes)`

Checks if user has authenticated recently or has an active verification session.

**Parameters:**
- `user_id`: UUID of the user
- `max_age_minutes`: Maximum age of authentication in minutes (default: 15)

**Returns:** `BOOLEAN`

### `has_mfa_verification(user_id, max_age_minutes)`

Checks if user has MFA enabled and verified recently. Returns `true` if MFA is not enabled (no requirement).

**Parameters:**
- `user_id`: UUID of the user
- `max_age_minutes`: Maximum age of MFA verification in minutes (default: 15)

**Returns:** `BOOLEAN`

### `create_verification_session(verification_method, ip_address, user_agent, session_duration_minutes)`

Creates a verification session. Should be called via edge function, not directly.

## RLS Policies

The `secure_storage` table has enhanced RLS policies that enforce:

- User ownership (`auth.uid() = user_id`)
- Recent authentication (`has_recent_authentication()`)
- MFA verification if enabled (`has_mfa_verification()`)

All operations (SELECT, INSERT, UPDATE, DELETE) require these conditions to be met.

## Best Practices

1. **Always create verification session after authentication**: Don't assume the user just logged in - explicitly create a session
2. **Handle session expiration gracefully**: If access fails, prompt for re-authentication
3. **Use appropriate verification method**: Use 'mfa' if MFA was used, 'password' for password-only auth
4. **Limit session duration**: Use the minimum duration needed (default 15 minutes is recommended)
5. **Clean up expired sessions**: The system automatically cleans up sessions older than 1 day

## Troubleshooting

### "Permission denied" errors

- Check if verification session exists and hasn't expired
- Verify user has authenticated recently (within 15 minutes)
- If MFA is enabled, ensure MFA verification was completed recently

### Session creation fails

- Verify user is authenticated (`supabase.auth.getUser()`)
- Check edge function is deployed and accessible
- Ensure request includes proper authorization header

### Access works initially but fails later

- Verification sessions expire after the configured duration (default: 15 minutes)
- Create a new verification session if needed
- Consider increasing session duration if legitimate use cases require longer access

## Migration

The security enhancements are applied via migration:
`supabase/migrations/20250125000000_secure_storage_auth_verification.sql`

This migration:
- Creates `auth_verification_sessions` table
- Adds helper functions for authentication checks
- Updates RLS policies on `secure_storage`
- Creates cleanup functions for expired sessions

## Security Considerations

- **Session Duration**: Default 15 minutes balances security and usability. Adjust based on your threat model
- **MFA Requirement**: Users with MFA enabled must complete MFA verification to access secure_storage
- **IP Tracking**: Verification sessions optionally track IP addresses for audit purposes
- **Automatic Cleanup**: Expired sessions are automatically cleaned up to prevent table bloat
