-- Enable Row Level Security
alter default privileges in schema public grant all on tables to postgres, service_role;

-- 1. PROFILES TABLE
-- Stores user profile information. Linked to auth.users.
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  username text unique,
  avatar_url text,
  status text default 'offline', -- 'online', 'in-game', 'offline'
  current_game text, -- Name of the game currently being played
  last_seen timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  constraint username_length check (char_length(username) >= 3)
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- 2. LINKED ACCOUNTS TABLE
-- Stores links to external platforms (Steam, Epic, etc.)
create table public.linked_accounts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  platform text not null, -- 'steam', 'epic', 'discord', 'xbox', etc.
  platform_user_id text not null, -- External ID
  platform_username text,
  is_visible boolean default true, -- If the user wants to show this on their profile
  created_at timestamp with time zone default timezone('utc'::text, now()),
  unique(user_id, platform)
);

-- Enable RLS on linked_accounts
alter table public.linked_accounts enable row level security;

-- Linked Accounts Policies
create policy "Linked accounts are viewable by everyone if visible."
  on linked_accounts for select
  using ( is_visible = true );

create policy "Users can see their own hidden linked accounts."
  on linked_accounts for select
  using ( auth.uid() = user_id );

create policy "Users can manage their own linked accounts."
  on linked_accounts for all
  using ( auth.uid() = user_id );

-- 3. FRIENDSHIPS TABLE
-- Manages friend relationships
create table public.friendships (
  id uuid default uuid_generate_v4() primary key,
  user_id_1 uuid references public.profiles(id) on delete cascade not null,
  user_id_2 uuid references public.profiles(id) on delete cascade not null,
  status text default 'pending', -- 'pending', 'accepted', 'blocked'
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now()),
  constraint not_self_friend check (user_id_1 != user_id_2),
  unique(user_id_1, user_id_2)
);

-- Enable RLS on friendships
alter table public.friendships enable row level security;

-- Friendships Policies
-- Users can see friendships they are part of
create policy "Users can see their own friendships."
  on friendships for select
  using ( auth.uid() = user_id_1 or auth.uid() = user_id_2 );

-- Users can create friend requests
create policy "Users can create friend requests."
  on friendships for insert
  with check ( auth.uid() = user_id_1 );

-- Users can update friendships they are part of (accept/block)
create policy "Users can update their own friendships."
  on friendships for update
  using ( auth.uid() = user_id_1 or auth.uid() = user_id_2 );


-- REALTIME SETUP
-- Add tables to the publication to enable Realtime subscriptions
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table profiles;
alter publication supabase_realtime add table friendships;

-- FUNCTIONS & TRIGGERS

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
