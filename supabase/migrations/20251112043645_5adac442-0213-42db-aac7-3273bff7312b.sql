-- Migration: Add role-based permission levels to trip_roles
-- Extends trip_roles with permission_level and feature-specific permissions

-- Create permission level enum
CREATE TYPE public.permission_level AS ENUM ('view', 'edit', 'admin');

-- Add permission columns to trip_roles
ALTER TABLE public.trip_roles
ADD COLUMN IF NOT EXISTS permission_level public.permission_level DEFAULT 'edit',
ADD COLUMN IF NOT EXISTS feature_permissions JSONB DEFAULT '{
  "channels": {
    "can_view": true,
    "can_post": true,
    "can_edit_messages": false,
    "can_delete_messages": false,
    "can_manage_members": false
  },
  "calendar": {
    "can_view": true,
    "can_create_events": true,
    "can_edit_events": false,
    "can_delete_events": false
  },
  "tasks": {
    "can_view": true,
    "can_create": true,
    "can_assign": false,
    "can_complete": true,
    "can_delete": false
  },
  "media": {
    "can_view": true,
    "can_upload": true,
    "can_delete_own": true,
    "can_delete_any": false
  },
  "payments": {
    "can_view": true,
    "can_create": false,
    "can_approve": false
  }
}'::jsonb;

-- Create index for faster permission lookups
CREATE INDEX IF NOT EXISTS idx_trip_roles_permission_level
ON public.trip_roles(permission_level);

-- Update existing roles based on role names
-- Coaches/Managers -> Admin
UPDATE public.trip_roles
SET 
  permission_level = 'admin',
  feature_permissions = '{
    "channels": {
      "can_view": true,
      "can_post": true,
      "can_edit_messages": true,
      "can_delete_messages": true,
      "can_manage_members": true
    },
    "calendar": {
      "can_view": true,
      "can_create_events": true,
      "can_edit_events": true,
      "can_delete_events": true
    },
    "tasks": {
      "can_view": true,
      "can_create": true,
      "can_assign": true,
      "can_complete": true,
      "can_delete": true
    },
    "media": {
      "can_view": true,
      "can_upload": true,
      "can_delete_own": true,
      "can_delete_any": true
    },
    "payments": {
      "can_view": true,
      "can_create": true,
      "can_approve": true
    }
  }'::jsonb
WHERE role_name ILIKE '%coach%' 
   OR role_name ILIKE '%manager%' 
   OR role_name ILIKE '%admin%'
   OR role_name ILIKE '%director%';

-- Players/Performers -> Edit
UPDATE public.trip_roles
SET 
  permission_level = 'edit',
  feature_permissions = '{
    "channels": {
      "can_view": true,
      "can_post": true,
      "can_edit_messages": false,
      "can_delete_messages": false,
      "can_manage_members": false
    },
    "calendar": {
      "can_view": true,
      "can_create_events": true,
      "can_edit_events": false,
      "can_delete_events": false
    },
    "tasks": {
      "can_view": true,
      "can_create": true,
      "can_assign": false,
      "can_complete": true,
      "can_delete": false
    },
    "media": {
      "can_view": true,
      "can_upload": true,
      "can_delete_own": true,
      "can_delete_any": false
    },
    "payments": {
      "can_view": true,
      "can_create": false,
      "can_approve": false
    }
  }'::jsonb
WHERE role_name ILIKE '%player%' 
   OR role_name ILIKE '%performer%'
   OR role_name ILIKE '%artist%'
   OR role_name ILIKE '%student%';

-- Crew/Security -> View (limited edit)
UPDATE public.trip_roles
SET 
  permission_level = 'view',
  feature_permissions = '{
    "channels": {
      "can_view": true,
      "can_post": false,
      "can_edit_messages": false,
      "can_delete_messages": false,
      "can_manage_members": false
    },
    "calendar": {
      "can_view": true,
      "can_create_events": false,
      "can_edit_events": false,
      "can_delete_events": false
    },
    "tasks": {
      "can_view": true,
      "can_create": false,
      "can_assign": false,
      "can_complete": true,
      "can_delete": false
    },
    "media": {
      "can_view": true,
      "can_upload": false,
      "can_delete_own": false,
      "can_delete_any": false
    },
    "payments": {
      "can_view": false,
      "can_create": false,
      "can_approve": false
    }
  }'::jsonb
WHERE role_name ILIKE '%crew%'
   OR role_name ILIKE '%security%'
   OR role_name ILIKE '%guest%';