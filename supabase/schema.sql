-- Where2Van database setup.
-- Paste this whole file into the Supabase SQL Editor and press Run.
-- It is safe to run more than once.
--
-- There is no sign-in: anyone who opens the website can see and change the
-- places. Keep the website's link between the two of us.

-- 1. The places on the map.
create table if not exists public.places (
  id uuid primary key,
  name text not null,
  address text not null default '',
  lat double precision not null,
  lng double precision not null,
  category text not null,
  status text not null default 'want' check (status in ('want', 'done')),
  note text not null default '',
  created_at timestamptz not null default now(),
  planned_for date,
  planned_time text not null default '',
  done_at date,
  rating smallint check (rating between 1 and 5),
  review text not null default ''
);

-- 2. Let the website read and change places without an account.
--    Only this one table is opened; nothing else in the project is.
alter table public.places enable row level security;

drop policy if exists "open map" on public.places;
create policy "open map" on public.places
  for all to anon, authenticated using (true) with check (true);

grant select, insert, update, delete on public.places to anon, authenticated;

-- 3. Live updates: when one of us changes something, the other sees it.
do $$
begin
  alter publication supabase_realtime add table public.places;
exception
  when duplicate_object then null;
end $$;

-- 4. Clean-up, in case the earlier sign-in version of this script was run.
drop policy if exists "members read places" on public.places;
drop policy if exists "members add places" on public.places;
drop policy if exists "members change places" on public.places;
drop policy if exists "members remove places" on public.places;
alter table public.places drop column if exists added_by;
drop function if exists public.is_member();
drop table if exists public.members;
