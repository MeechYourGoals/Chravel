-- Fix Supabase Database Linter: SUPA_security_definer_view (0010_security_definer_view)
-- Ensure views run as SECURITY INVOKER so underlying permissions/RLS apply to the querying user.
--
-- Problem:
-- - `public.profiles_public` was recreated without `security_invoker = true`, so it defaults to
--   "definer" semantics and can unintentionally apply the view owner's permissions/RLS.
-- - We intentionally REVOKE direct access to `public.profiles.email` and `public.profiles.phone`
--   for privacy. If we simply make the view SECURITY INVOKER and select `p.email/p.phone`,
--   authenticated users would hit permission errors.
--
-- Surgical fix:
-- - Keep `public.profiles.email/phone` revoked for direct reads.
-- - Make `public.profiles_public` SECURITY INVOKER.
-- - Provide email/phone through a tightly-scoped SECURITY DEFINER helper that enforces:
--   - requester must be authenticated
--   - requester must be the profile owner OR share a trip with that profile user
--   - email/phone only returned when opted-in (show_*) or owner
--
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

create or replace function public.get_profiles_public_contact(p_profile_user_id uuid)
returns table (
  email text,
  phone text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Defense-in-depth: only allow contact resolution for the owner or a co-member.
  return query
  select
    case
      when p.user_id = auth.uid() or p.show_email is true then p.email
      else null
    end as email,
    case
      when p.user_id = auth.uid() or p.show_phone is true then p.phone
      else null
    end as phone
  from public.profiles p
  where
    p.user_id = p_profile_user_id
    and (
      p.user_id = auth.uid()
      or exists (
        select 1
        from public.trip_members tm1
        join public.trip_members tm2 on tm1.trip_id = tm2.trip_id
        where tm1.user_id = auth.uid()
          and tm2.user_id = p.user_id
      )
    );
end;
$$;

revoke all on function public.get_profiles_public_contact(uuid) from public;
revoke all on function public.get_profiles_public_contact(uuid) from anon;
grant execute on function public.get_profiles_public_contact(uuid) to authenticated;

create or replace view public.profiles_public
with (security_invoker = true, security_barrier = true)
as
select
  p.id,
  p.user_id,
  p.display_name,
  p.first_name,
  p.last_name,
  p.avatar_url,
  p.bio,
  p.show_email,
  p.show_phone,
  p.created_at,
  p.updated_at,
  c.email,
  c.phone
from public.profiles p
left join lateral public.get_profiles_public_contact(p.user_id) c on true
where
  -- Always allow users to see their own profile in the view
  p.user_id = auth.uid()
  or
  -- Co-member visibility: only users who share at least one trip
  exists (
    select 1
    from public.trip_members tm1
    join public.trip_members tm2 on tm1.trip_id = tm2.trip_id
    where tm1.user_id = auth.uid()
      and tm2.user_id = p.user_id
  );

revoke all on public.profiles_public from anon;
grant select on public.profiles_public to authenticated;

