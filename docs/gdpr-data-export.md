# GDPR Data Export Feature

This document describes the GDPR-compliant data export feature that allows users to download all their personal data from Chravel.

## Overview

The data export feature implements GDPR Article 20 (Right to Data Portability), allowing users to:

1. Request a complete export of their personal data
2. Download the data in a portable JSON format
3. View metadata about what data is included

## Architecture

### Components

1. **Edge Function**: `supabase/functions/export-user-data/index.ts`
   - Handles the export request
   - Queries all relevant user tables
   - Generates a JSON file with all user data
   - Uploads to private storage bucket
   - Returns a signed URL for download

2. **Storage Bucket**: `user-data-exports`
   - Private bucket for storing export files
   - Files are organized by user ID: `{user_id}/{filename}.json`
   - RLS policies ensure users can only access their own exports

3. **React Hook**: `src/hooks/useDataExport.ts`
   - Manages export state (loading, success, error)
   - Handles API calls to the Edge Function
   - Provides download functionality

4. **UI Component**: `src/components/settings/DataExportSection.tsx`
   - Confirmation dialog before export
   - Progress and status display
   - Download button with file details
   - Error handling for rate limits

5. **Integration**: `src/components/consumer/ConsumerPrivacySection.tsx`
   - Data export section is displayed in Settings → Privacy & Security

## Tables Included in Export

The export includes data from the following tables. Each table is queried using the appropriate user identifier column.

| Table | User Column | Description |
|-------|-------------|-------------|
| `profiles` | `user_id` | User profile information |
| `user_preferences` | `user_id` | App preferences and settings |
| `notification_preferences` | `user_id` | Notification settings |
| `push_device_tokens` | `user_id` | Registered devices for push |
| `loyalty_airlines` | `user_id` | Airline loyalty programs |
| `loyalty_hotels` | `user_id` | Hotel loyalty programs |
| `loyalty_rentals` | `user_id` | Rental car loyalty programs |
| `user_payment_methods` | `user_id` | Saved payment methods (redacted) |
| `user_accommodations` | `user_id` | Accommodation preferences |
| `trips` | `created_by` | Trips created by user |
| `trip_members` | `user_id` | Trip memberships |
| `trip_admins` | `user_id` | Admin roles |
| `trip_invites` | `invited_by` | Invitations sent |
| `trip_join_requests` | `user_id` | Join requests made |
| `trip_personal_basecamps` | `user_id` | Personal basecamp locations |
| `trip_member_preferences` | `user_id` | Per-trip preferences |
| `trip_chat_messages` | `user_id` | Chat messages sent |
| `channel_messages` | `sender_id` | Channel messages sent |
| `channel_members` | `user_id` | Channel memberships |
| `message_read_receipts` | `user_id` | Message read receipts |
| `broadcasts` | `created_by` | Broadcasts created |
| `broadcast_reactions` | `user_id` | Reactions to broadcasts |
| `trip_tasks` | `created_by` | Tasks created |
| `task_assignments` | `user_id` | Tasks assigned |
| `task_status` | `updated_by` | Task status changes |
| `trip_polls` | `created_by` | Polls created |
| `trip_events` | `created_by` | Events created |
| `event_rsvps` | `user_id` | Event RSVPs |
| `event_qa_questions` | `user_id` | Q&A questions asked |
| `event_qa_upvotes` | `user_id` | Q&A upvotes |
| `event_agenda_items` | `created_by` | Agenda items created |
| `event_tasks` | `created_by` | Event tasks created |
| `trip_payment_messages` | `payer_id` | Payments made |
| `payment_splits` | `payer_id` | Payment splits |
| `trip_receipts` | `uploaded_by` | Receipts uploaded |
| `receipts` | `user_id` | Receipt records |
| `trip_files` | `uploaded_by` | Files uploaded |
| `trip_links` | `created_by` | Links shared |
| `organization_members` | `user_id` | Org memberships |
| `organizations` | `created_by` | Organizations created |
| `ai_queries` | `user_id` | AI concierge queries |
| `saved_recommendations` | `user_id` | Saved recommendations |
| `concierge_usage` | `user_id` | AI usage stats |
| `notifications` | `user_id` | Notifications |
| `user_roles` | `user_id` | System roles |
| `user_trip_roles` | `user_id` | Trip-specific roles |
| `user_entitlements` | `user_id` | Subscription entitlements |
| `advertisers` | `user_id` | Advertiser account |

## Adding New Tables to the Export

To add a new table to the data export:

1. **Edit the Edge Function** (`supabase/functions/export-user-data/index.ts`)

2. **Add an entry to `USER_DATA_TABLES`**:

```typescript
const USER_DATA_TABLES = [
  // ... existing tables ...
  
  // Add your new table:
  { 
    table: 'your_new_table', 
    userColumn: 'user_id',  // or 'created_by', etc.
    description: 'Human-readable description of what this data contains' 
  },
];
```

3. **Test the export** to ensure:
   - The table is accessible via RLS policies
   - The query doesn't timeout for users with lots of data
   - Sensitive fields are properly redacted

4. **Update this documentation** with the new table.

## Export Format

The export JSON has the following structure:

```json
{
  "_metadata": {
    "exportTimestamp": "2025-01-10T12:00:00.000Z",
    "userId": "uuid",
    "userEmail": "user@example.com",
    "schemaVersion": "1.0.0",
    "appVersion": "Chravel 2025",
    "exportFormat": "JSON",
    "tablesIncluded": ["profiles", "trips", ...],
    "dataRetentionNote": "...",
    "legalBasis": "GDPR Article 20 - Right to data portability"
  },
  "_tableDescriptions": {
    "profiles": "User profile information",
    "trips": "Trips you created",
    ...
  },
  "_mediaFiles": {
    "note": "Signed URLs for your uploaded files. URLs expire in 1 hour.",
    "files": [
      {
        "path": "path/to/file.jpg",
        "signedUrl": "https://...",
        "expiresAt": "2025-01-10T13:00:00.000Z"
      }
    ]
  },
  "profiles": [{ ... }],
  "trips": [{ ... }],
  "trip_members": [{ ... }],
  ...
}
```

## Security Considerations

1. **Authentication**: Only authenticated users can request exports
2. **Authorization**: Users can only export their own data
3. **Rate Limiting**: 1 export per user per 24 hours
4. **Signed URLs**: Download URLs expire after 1 hour
5. **Data Redaction**: Sensitive fields (passwords, tokens, card numbers) are redacted
6. **Private Storage**: Export files are stored in a private bucket
7. **Audit Trail**: Export requests are logged in `data_export_requests` table

## Rate Limiting

- **Limit**: 1 export per user per 24 hours
- **Implementation**: Uses the shared `increment_rate_limit` RPC function
- **Rationale**: Prevents abuse and reduces server load

## Cleanup

Export files should be cleaned up periodically:

1. The `cleanup_expired_data_exports()` function marks exports as expired
2. Files older than 24 hours are eligible for deletion
3. Tracking records older than 30 days are deleted

To run cleanup manually:

```sql
SELECT public.cleanup_expired_data_exports();
```

Consider setting up a daily cron job to run this function.

## Testing

### Manual Test Steps

1. Log in to Chravel with a test account
2. Navigate to Settings → Privacy & Security
3. Scroll down to "Export Your Data"
4. Click "Export My Data"
5. Review the confirmation dialog showing what's included
6. Click "Start Export"
7. Wait for the export to complete (should take a few seconds)
8. Verify the success message shows:
   - Total records exported
   - File size
   - Expiration time
9. Click "Download" to download the JSON file
10. Open the file and verify it contains:
    - `_metadata` section with correct user info
    - `_tableDescriptions` mapping
    - Data from various tables
11. Try exporting again immediately - should get rate limit error

### Integration Tests

Add tests in `src/__tests__/` for:

- `useDataExport` hook state transitions
- `DataExportSection` component rendering
- Error and rate limit handling

## Troubleshooting

### Export fails with 401 Unauthorized

- Ensure the user is logged in
- Check that the JWT token hasn't expired
- Verify the Edge Function is deployed

### Export fails with 429 Rate Limited

- User has already exported within the last 24 hours
- Wait for the rate limit window to reset

### Export is slow or times out

- For users with lots of data, the export may take time
- Consider increasing the Edge Function timeout
- Check if any table queries are particularly slow

### Missing data in export

- Verify the table is in `USER_DATA_TABLES`
- Check RLS policies allow the user to read their data
- Look for errors in Edge Function logs

## Future Improvements

1. **Email notification** when export is ready
2. **ZIP format** with separate CSV files per table
3. **Include actual media files** in the export (not just URLs)
4. **Export history** in the UI
5. **Scheduled exports** for Pro users
6. **Data deletion** (GDPR right to erasure) companion feature
