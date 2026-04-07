create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (char_length(username) >= 3),
  created_at timestamptz default now()
);

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.photos enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = user_id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "photos_select_own" on public.photos;
drop policy if exists "photos_insert_own" on public.photos;
drop policy if exists "photos_delete_own" on public.photos;

create policy "photos_select_own"
on public.photos
for select
to authenticated
using (auth.uid() = user_id);

create policy "photos_insert_own"
on public.photos
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "photos_delete_own"
on public.photos
for delete
to authenticated
using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

drop policy if exists "storage_view_own_photos" on storage.objects;
drop policy if exists "storage_insert_own_photos" on storage.objects;
drop policy if exists "storage_delete_own_photos" on storage.objects;

-- Restored SELECT policy for secure photo listing.
-- This is required for Private buckets to allow the app to generate temporary signed URLs.
-- ONLY the authenticated owner can select/view their own photos.
create policy "storage_view_own_photos"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "storage_insert_own_photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "storage_delete_own_photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);
