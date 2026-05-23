-- Katha Database Schema
-- Run this in Supabase: Database → SQL Editor → New query → paste → Run

create table if not exists public.stories (
  id         bigserial primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  story_data jsonb not null,
  credit_map jsonb,
  created_at timestamptz default now() not null
);

alter table public.stories enable row level security;

-- Anyone (including anonymous/guest) can read all stories for the public feed
create policy "public_read_stories" on public.stories
  for select
  to anon, authenticated
  using (true);

-- Only the owner can insert their own stories
create policy "users_insert_own" on public.stories
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Only the owner can update their own stories
create policy "users_update_own" on public.stories
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Only the owner can delete their own stories
create policy "users_delete_own" on public.stories
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- NOTE: If upgrading from the old schema, run this to replace the old policy:
-- drop policy if exists "users_own_stories" on public.stories;
