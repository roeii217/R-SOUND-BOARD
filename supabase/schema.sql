-- ====================================================================
-- EchoBoard: Supabase Database Schema & Storage Configuration
-- ====================================================================

-- 1. Create Rooms Table
create table if not exists public.rooms (
  id text primary key, -- 6-character room code (e.g. "ECHO-88")
  name text not null default 'My Soundboard Room',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  config jsonb default '{"volume": 0.8, "isMuted": false, "playbackMode": "polyphonic", "theme": "dark"}'::jsonb
);

-- 2. Create Categories Table
create table if not exists public.categories (
  id text primary key,
  room_id text references public.rooms(id) on delete cascade not null,
  name text not null,
  order_index int not null default 0,
  icon text default 'Volume2',
  created_at timestamptz default now()
);

-- 3. Create Sounds Table
create table if not exists public.sounds (
  id text primary key,
  room_id text references public.rooms(id) on delete cascade not null,
  category_id text references public.categories(id) on delete set null,
  name text not null,
  audio_url text not null,
  duration numeric default 0,
  color text default '#6366f1',
  hotkey text,
  order_index int not null default 0,
  volume numeric default 1.0,
  loop boolean default false,
  created_at timestamptz default now()
);

-- 4. Enable Row Level Security (RLS) - Permissive public access for simple room sharing
alter table public.rooms enable row level security;
alter table public.categories enable row level security;
alter table public.sounds enable row level security;

create policy "Allow all actions on rooms" on public.rooms for all using (true) with check (true);
create policy "Allow all actions on categories" on public.categories for all using (true) with check (true);
create policy "Allow all actions on sounds" on public.sounds for all using (true) with check (true);

-- 5. Enable Realtime Publications
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;

alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.categories;
alter publication supabase_realtime add table public.sounds;

-- 6. Setup Storage Bucket for Audio Files
insert into storage.buckets (id, name, public)
values ('soundboard-audio', 'soundboard-audio', true)
on conflict (id) do nothing;

create policy "Public Soundboard Audio Access" on storage.objects 
  for select using (bucket_id = 'soundboard-audio');

create policy "Public Soundboard Audio Upload" on storage.objects 
  for insert with check (bucket_id = 'soundboard-audio');

create policy "Public Soundboard Audio Update" on storage.objects 
  for update using (bucket_id = 'soundboard-audio');

create policy "Public Soundboard Audio Delete" on storage.objects 
  for delete using (bucket_id = 'soundboard-audio');
