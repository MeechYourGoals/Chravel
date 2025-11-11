# Database Schema Documentation

## Overview

Chravel uses PostgreSQL via Supabase with Row Level Security (RLS) policies. This document describes the database schema and relationships.

## Generating ER Diagram

### Method 1: Using Supabase CLI + dbdiagram.io

**Step 1: Export schema**
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref <your-project-ref>

# Generate migration diff
supabase db diff --schema public -f schema_export

# This creates a SQL file with all table definitions
```

**Step 2: Convert to dbdiagram.io format**

Create `scripts/generate-dbdiagram.js`:
```javascript
// Converts Supabase migrations to dbdiagram.io syntax
// Run: node scripts/generate-dbdiagram.js > docs/database.dbml
```

**Step 3: Visualize**
1. Go to [dbdiagram.io](https://dbdiagram.io)
2. Paste the generated `.dbml` file
3. Export as PNG/PDF

### Method 2: Using pgAdmin or DBeaver

1. Connect to Supabase database
2. Tools → ER Diagram Generator
3. Select all tables
4. Export as image

### Method 3: Automated Script

Create `scripts/export-schema.sh`:
```bash
#!/bin/bash
# Export schema and generate ER diagram

supabase db dump --schema public > schema.sql
# Convert to dbml (requires custom script)
node scripts/sql-to-dbml.js schema.sql > docs/database.dbml
```

## Core Tables

### `trips`
**Purpose:** Main trip/event container

**Columns:**
- `id` (UUID, PK)
- `name` (TEXT, NOT NULL)
- `description` (TEXT)
- `created_by` (UUID, FK → `users.id`)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `start_date` (DATE)
- `end_date` (DATE)
- `destination` (JSONB) - `{ name, lat, lng }`
- `privacy` (ENUM: 'public' | 'private' | 'invite-only')
- `invite_code` (TEXT, UNIQUE)
- `settings` (JSONB) - Trip-specific settings

**Indexes:**
- `idx_trips_created_by` on `created_by`
- `idx_trips_invite_code` on `invite_code`
- `idx_trips_privacy` on `privacy`

**RLS Policies:**
- Users can read trips they're members of
- Creators can update/delete their trips

---

### `trip_members`
**Purpose:** Many-to-many relationship between users and trips

**Columns:**
- `id` (UUID, PK)
- `trip_id` (UUID, FK → `trips.id`)
- `user_id` (UUID, FK → `users.id`)
- `role` (TEXT) - 'creator' | 'admin' | 'member' | 'viewer'
- `joined_at` (TIMESTAMPTZ)
- `status` (TEXT) - 'active' | 'left' | 'removed'

**Indexes:**
- `idx_trip_members_trip` on `trip_id`
- `idx_trip_members_user` on `user_id`
- `UNIQUE(trip_id, user_id)` where `status = 'active'`

---

### `trip_channels`
**Purpose:** Chat channels within trips (Slack-like)

**Columns:**
- `id` (UUID, PK)
- `trip_id` (UUID, FK → `trips.id`)
- `name` (TEXT, NOT NULL)
- `description` (TEXT)
- `type` (TEXT) - 'general' | 'announcements' | 'custom'
- `required_role_id` (UUID, FK → `trip_roles.id`) - Deprecated, use `channel_role_access`
- `created_at` (TIMESTAMPTZ)
- `is_archived` (BOOLEAN, DEFAULT false)

**Indexes:**
- `idx_channels_trip` on `trip_id`
- `idx_channels_type` on `type`

---

### `messages`
**Purpose:** Chat messages in channels

**Columns:**
- `id` (UUID, PK)
- `channel_id` (UUID, FK → `trip_channels.id`)
- `user_id` (UUID, FK → `users.id`)
- `content` (TEXT, NOT NULL)
- `type` (TEXT) - 'text' | 'image' | 'file' | 'system'
- `metadata` (JSONB) - `{ attachments, parsedContent, mentions }`
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `edited_at` (TIMESTAMPTZ)
- `deleted_at` (TIMESTAMPTZ) - Soft delete

**Indexes:**
- `idx_messages_channel` on `channel_id`
- `idx_messages_user` on `user_id`
- `idx_messages_created` on `created_at DESC`
- `idx_messages_content_search` - GIN index on `content` for full-text search

---

### `tasks`
**Purpose:** Task management within trips

**Columns:**
- `id` (UUID, PK)
- `trip_id` (UUID, FK → `trips.id`)
- `created_by` (UUID, FK → `users.id`)
- `title` (TEXT, NOT NULL)
- `description` (TEXT)
- `status` (TEXT) - 'todo' | 'in_progress' | 'done' | 'cancelled'
- `priority` (TEXT) - 'low' | 'normal' | 'high'
- `assigned_to` (UUID[], FK → `users.id`) - Array of user IDs
- `due_date` (TIMESTAMPTZ)
- `completed_at` (TIMESTAMPTZ)
- `metadata` (JSONB) - `{ tags, checklist, attachments }`

**Indexes:**
- `idx_tasks_trip` on `trip_id`
- `idx_tasks_status` on `status`
- `idx_tasks_assigned` on `assigned_to` (GIN)
- `idx_tasks_due_date` on `due_date`

---

### `expenses`
**Purpose:** Expense tracking and splitting

**Columns:**
- `id` (UUID, PK)
- `trip_id` (UUID, FK → `trips.id`)
- `created_by` (UUID, FK → `users.id`)
- `description` (TEXT, NOT NULL)
- `amount` (DECIMAL(10,2), NOT NULL)
- `currency` (TEXT, DEFAULT 'USD')
- `category` (TEXT) - 'food' | 'transport' | 'accommodation' | 'activity' | 'other'
- `paid_by` (UUID, FK → `users.id`)
- `split_among` (UUID[], FK → `users.id`) - Array of user IDs
- `split_type` (TEXT) - 'equal' | 'custom' | 'percentage'
- `split_details` (JSONB) - Custom split amounts
- `receipt_url` (TEXT) - Supabase Storage URL
- `created_at` (TIMESTAMPTZ)

**Indexes:**
- `idx_expenses_trip` on `trip_id`
- `idx_expenses_paid_by` on `paid_by`
- `idx_expenses_category` on `category`

---

### `media`
**Purpose:** Shared photos/videos in trips

**Columns:**
- `id` (UUID, PK)
- `trip_id` (UUID, FK → `trips.id`)
- `uploaded_by` (UUID, FK → `users.id`)
- `url` (TEXT, NOT NULL) - Supabase Storage URL
- `thumbnail_url` (TEXT)
- `type` (TEXT) - 'image' | 'video'
- `filename` (TEXT)
- `size` (BIGINT) - Bytes
- `metadata` (JSONB) - `{ width, height, duration, location, taken_at }`
- `created_at` (TIMESTAMPTZ)

**Indexes:**
- `idx_media_trip` on `trip_id`
- `idx_media_uploaded_by` on `uploaded_by`
- `idx_media_created` on `created_at DESC`

---

### `calendar_events`
**Purpose:** Itinerary items and calendar events

**Columns:**
- `id` (UUID, PK)
- `trip_id` (UUID, FK → `trips.id`)
- `created_by` (UUID, FK → `users.id`)
- `title` (TEXT, NOT NULL)
- `description` (TEXT)
- `start_time` (TIMESTAMPTZ, NOT NULL)
- `end_time` (TIMESTAMPTZ)
- `location` (JSONB) - `{ name, address, lat, lng, place_id }`
- `type` (TEXT) - 'activity' | 'meal' | 'transport' | 'accommodation' | 'other'
- `attendees` (UUID[], FK → `users.id`)
- `metadata` (JSONB) - `{ notes, attachments, reminders }`

**Indexes:**
- `idx_events_trip` on `trip_id`
- `idx_events_start_time` on `start_time`
- `idx_events_type` on `type`

---

## Enterprise Tables

### `organizations`
**Purpose:** Enterprise/organization accounts

**Columns:**
- `id` (UUID, PK)
- `name` (TEXT, NOT NULL)
- `slug` (TEXT, UNIQUE)
- `type` (TEXT) - 'sports_team' | 'music_tour' | 'corporate' | 'festival'
- `settings` (JSONB)
- `created_at` (TIMESTAMPTZ)

---

### `organization_members`
**Purpose:** Users belonging to organizations

**Columns:**
- `id` (UUID, PK)
- `organization_id` (UUID, FK → `organizations.id`)
- `user_id` (UUID, FK → `users.id`)
- `role` (TEXT) - 'owner' | 'admin' | 'member'
- `permissions` (JSONB)
- `joined_at` (TIMESTAMPTZ)

---

### `broadcasts`
**Purpose:** Broadcast messages to organization/trip members

**Columns:**
- `id` (UUID, PK)
- `trip_id` (UUID, FK → `trips.id`)
- `organization_id` (UUID, FK → `organizations.id`)
- `created_by` (UUID, FK → `users.id`)
- `title` (TEXT, NOT NULL)
- `message` (TEXT, NOT NULL)
- `priority` (TEXT) - 'low' | 'normal' | 'high' | 'urgent'
- `scheduled_for` (TIMESTAMPTZ)
- `sent_at` (TIMESTAMPTZ)
- `recipient_type` (TEXT) - 'all' | 'role' | 'user'
- `recipient_ids` (UUID[])
- `metadata` (JSONB)

**Indexes:**
- `idx_broadcasts_trip` on `trip_id`
- `idx_broadcasts_org` on `organization_id`
- `idx_broadcasts_scheduled` on `scheduled_for`

---

## Authentication & Users

### `users` (Supabase Auth)
**Note:** Managed by Supabase Auth. Access via `auth.users` view.

**Columns:**
- `id` (UUID, PK)
- `email` (TEXT)
- `created_at` (TIMESTAMPTZ)
- ... (other Supabase Auth fields)

### `profiles`
**Purpose:** Extended user profile data

**Columns:**
- `id` (UUID, PK, FK → `auth.users.id`)
- `display_name` (TEXT)
- `avatar_url` (TEXT)
- `bio` (TEXT)
- `preferences` (JSONB)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

---

## Supporting Tables

### `trip_roles`
**Purpose:** Custom roles for trips (Enterprise)

**Columns:**
- `id` (UUID, PK)
- `trip_id` (UUID, FK → `trips.id`)
- `name` (TEXT, NOT NULL)
- `permissions` (JSONB)
- `created_at` (TIMESTAMPTZ)

---

### `user_trip_roles`
**Purpose:** Assign roles to users in trips

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → `users.id`)
- `trip_id` (UUID, FK → `trips.id`)
- `role_id` (UUID, FK → `trip_roles.id`)
- `is_primary` (BOOLEAN, DEFAULT true)
- `assigned_at` (TIMESTAMPTZ)

**Constraints:**
- `UNIQUE(user_id, trip_id)` where `is_primary = true`

---

### `channel_role_access`
**Purpose:** Multi-role channel access (replaces single `required_role_id`)

**Columns:**
- `id` (UUID, PK)
- `channel_id` (UUID, FK → `trip_channels.id`)
- `role_id` (UUID, FK → `trip_roles.id`)
- `created_at` (TIMESTAMPTZ)

**Constraints:**
- `UNIQUE(channel_id, role_id)`

---

### `notification_preferences`
**Purpose:** User notification settings

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → `users.id`)
- `trip_id` (UUID, FK → `trips.id`) - NULL for global preferences
- `channels` (JSONB) - `{ email, push, sms }`
- `types` (JSONB) - Per-type preferences
- `quiet_hours` (JSONB) - `{ start, end }`

---

### `push_tokens`
**Purpose:** Device push notification tokens

**Columns:**
- `id` (UUID, PK)
- `user_id` (UUID, FK → `users.id`)
- `token` (TEXT, NOT NULL, UNIQUE)
- `platform` (TEXT) - 'ios' | 'android' | 'web'
- `device_id` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `last_used_at` (TIMESTAMPTZ)

---

## Caching & Performance Tables

### `google_places_cache`
**Purpose:** Cache Google Places API responses

**Columns:**
- `id` (UUID, PK)
- `place_id` (TEXT, UNIQUE)
- `data` (JSONB)
- `cached_at` (TIMESTAMPTZ)
- `expires_at` (TIMESTAMPTZ)

**Indexes:**
- `idx_places_cache_expires` on `expires_at`

---

### `google_maps_api_usage`
**Purpose:** Track API usage for rate limiting

**Columns:**
- `id` (UUID, PK)
- `trip_id` (UUID, FK → `trips.id`)
- `service` (TEXT) - 'places' | 'directions' | 'geocoding'
- `requests_count` (INTEGER, DEFAULT 0)
- `date` (DATE)
- `created_at` (TIMESTAMPTZ)

**Indexes:**
- `idx_api_usage_trip_date` on `(trip_id, date)`

---

## Relationships Summary

```
users (auth.users)
  ├── profiles (1:1)
  ├── trip_members (1:N)
  ├── messages (1:N)
  ├── tasks (1:N, created_by)
  ├── expenses (1:N, created_by/paid_by)
  └── media (1:N, uploaded_by)

trips (1:N)
  ├── trip_members
  ├── trip_channels
  ├── tasks
  ├── expenses
  ├── media
  ├── calendar_events
  └── trip_roles

trip_channels (1:N)
  └── messages

organizations (1:N)
  ├── organization_members
  └── trips (via link_trip_to_organization)
```

## Database Diagram Generation

### Quick Start

1. **Export schema:**
   ```bash
   supabase db dump --schema public > schema.sql
   ```

2. **Generate dbml:**
   ```bash
   node scripts/sql-to-dbml.js schema.sql > docs/database.dbml
   ```

3. **Visualize:**
   - Open [dbdiagram.io](https://dbdiagram.io)
   - Paste `docs/database.dbml`
   - Export as PNG/PDF

### dbml Template

Example `.dbml` syntax:
```dbml
Table trips {
  id uuid [pk]
  name text [not null]
  created_by uuid [ref: > users.id]
  created_at timestamptz
}

Table trip_members {
  id uuid [pk]
  trip_id uuid [ref: > trips.id]
  user_id uuid [ref: > users.id]
  role text
}
```

---

**Last Updated:** 2025-01-31  
**Maintained By:** Engineering Team
