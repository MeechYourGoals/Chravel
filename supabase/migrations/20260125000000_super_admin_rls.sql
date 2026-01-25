-- Super admin read access (no membership auto-join)
-- Purpose: Allow trusted super admins to view any trip data without appearing as members.

-- Helper function to check super admin via JWT email claim
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = ANY (
    ARRAY[
      'ccamechi@gmail.com'
    ]
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- Add SELECT policies for super admin across trip-scoped tables
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'trips',
    'trip_members',
    'trip_admins',
    'trip_roles',
    'trip_channels',
    'trip_chat_messages',
    'trip_events',
    'trip_tasks',
    'trip_polls',
    'trip_links',
    'trip_link_index',
    'trip_media_index',
    'trip_files',
    'trip_payment_messages',
    'trip_preferences',
    'trip_member_preferences',
    'trip_presence',
    'trip_receipts',
    'trip_places',
    'trip_personal_basecamps',
    'trip_invites',
    'trip_join_requests',
    'trip_embeddings'
  ]
  LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format(
        'CREATE POLICY "Super admins can view %1$s" ON public.%1$s FOR SELECT USING (public.is_super_admin())',
        tbl
      );
    END IF;
  END LOOP;
END $$;
