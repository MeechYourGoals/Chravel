-- Enable pgcrypto extension for UUID generation
create extension if not exists pgcrypto;

-- Add default UUID generator to trips.id (keeping text type for compatibility)
alter table public.trips 
  alter column id set default gen_random_uuid()::text;

-- Add index on created_by for better query performance
create index if not exists idx_trips_created_by 
  on public.trips (created_by);

-- Add comment for documentation
comment on column public.trips.id is 'Auto-generated UUID as text for compatibility with existing foreign keys';