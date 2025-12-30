-- Fix Supabase Database Linter: SUPA_security_definer_view (0010_security_definer_view)
-- Views should be SECURITY INVOKER so RLS/permissions apply to the querying user.
--
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

-- -----------------------------------------------------------------------------
-- profiles_public
-- -----------------------------------------------------------------------------
-- NOTE:
-- `public.profiles` intentionally revokes direct SELECT access for (email, phone)
-- (see 20251226000000_profiles_public_view.sql). To keep that privacy model intact
-- while making this view SECURITY INVOKER, we do NOT expose email/phone on the view.
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
  p.created_at,
  p.updated_at
from public.profiles p;

revoke all on public.profiles_public from anon;
grant select on public.profiles_public to authenticated;

-- -----------------------------------------------------------------------------
-- broadcast_stats
-- -----------------------------------------------------------------------------
create or replace view public.broadcast_stats
with (security_invoker = true)
as
select
  b.id as broadcast_id,
  b.trip_id,
  count(distinct bv.user_id) as read_count,
  count(distinct br.user_id) as reaction_count,
  count(distinct case when br.reaction_type = 'coming' then br.user_id end) as coming_count,
  count(distinct case when br.reaction_type = 'wait' then br.user_id end) as wait_count,
  count(distinct case when br.reaction_type = 'cant' then br.user_id end) as cant_count
from public.broadcasts b
left join public.broadcast_views bv on b.id = bv.broadcast_id
left join public.broadcast_reactions br on b.id = br.broadcast_id
group by b.id, b.trip_id;

grant select on public.broadcast_stats to authenticated;

-- -----------------------------------------------------------------------------
-- Helper RPC: search users to invite by email/name
-- -----------------------------------------------------------------------------
-- UI needs email/name search, but email should only be returned when explicitly shared
-- (show_email) or the requesting user is querying their own profile.
create or replace function public.search_profiles_public(
  p_query text,
  p_limit integer default 10
)
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  email text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_query text := btrim(coalesce(p_query, ''));
  safe_limit integer := least(greatest(coalesce(p_limit, 10), 1), 20);
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if normalized_query = '' then
    return;
  end if;

  return query
  select
    p.user_id,
    p.display_name,
    p.avatar_url,
    case
      when p.show_email is true or p.user_id = auth.uid() then p.email
      else null
    end as email
  from public.profiles p
  where
    coalesce(p.display_name, '') ilike ('%' || normalized_query || '%')
    or coalesce(p.email, '') ilike ('%' || normalized_query || '%')
  order by p.display_name nulls last, p.created_at desc
  limit safe_limit;
end;
$$;

revoke all on function public.search_profiles_public(text, integer) from public;
grant execute on function public.search_profiles_public(text, integer) to authenticated;
