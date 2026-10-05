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

-- 4. Photos of the places we've been.
alter table public.places add column if not exists photos text[] not null default '{}';

-- One storage folder ("bucket") for them: pictures only, 5 MB each at most.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', true, 5242880, array['image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Like the map itself, photos can be added and removed without an account.
drop policy if exists "open photos read" on storage.objects;
drop policy if exists "open photos add" on storage.objects;
drop policy if exists "open photos remove" on storage.objects;

create policy "open photos read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'photos');

create policy "open photos add" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'photos');

create policy "open photos remove" on storage.objects
  for delete to anon, authenticated using (bucket_id = 'photos');

-- 5. A rating each: what each of the two of us gave a place.
alter table public.places
  add column if not exists rating_a smallint check (rating_a between 1 and 5);
alter table public.places
  add column if not exists rating_b smallint check (rating_b between 1 and 5);

-- Our names and the faces we rate with: one shared row.
create table if not exists public.settings (
  id smallint primary key default 1 check (id = 1),
  people jsonb not null default '{}'
);

alter table public.settings enable row level security;

drop policy if exists "open settings" on public.settings;
create policy "open settings" on public.settings
  for all to anon, authenticated using (true) with check (true);

grant select, insert, update on public.settings to anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.settings;
exception
  when duplicate_object then null;
end $$;

-- 6. Clean-up, in case the earlier sign-in version of this script was run.
drop policy if exists "members read places" on public.places;
drop policy if exists "members add places" on public.places;
drop policy if exists "members change places" on public.places;
drop policy if exists "members remove places" on public.places;
alter table public.places drop column if exists added_by;
drop function if exists public.is_member();
drop table if exists public.members;
