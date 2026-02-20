-- Add enterprise-specific notification preference columns
-- Used by Enterprise Settings > Notification Preferences

ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS org_announcements BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS team_updates BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS billing_alerts BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS email_digest BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.notification_preferences.org_announcements IS 'Organization-level announcements from administrators';
COMMENT ON COLUMN public.notification_preferences.team_updates IS 'Changes to team members and permissions';
COMMENT ON COLUMN public.notification_preferences.billing_alerts IS 'Subscription and payment notifications';
COMMENT ON COLUMN public.notification_preferences.email_digest IS 'Weekly email summary of activity across trips';
