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

create policy "users_own_stories" on public.stories
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
