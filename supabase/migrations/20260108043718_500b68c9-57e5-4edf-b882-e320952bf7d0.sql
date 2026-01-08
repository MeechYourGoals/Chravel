-- Add founder to user_roles with enterprise_admin role
-- This ensures super admin access via role-based check in addition to email allowlist

INSERT INTO public.user_roles (user_id, role)
VALUES ('013d9240-10c0-44e5-8da5-abfa2c4751c5', 'enterprise_admin')
ON CONFLICT (user_id, role) DO NOTHING;