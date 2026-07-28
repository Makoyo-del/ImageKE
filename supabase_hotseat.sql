-- =============================================================================
-- THE RESUME HOT SEAT DATABASE SCHEMA (IDEMPOTENT / SAFE TO RUN MULTIPLE TIMES)
-- Copy and paste this script directly into your Supabase SQL Editor.
-- =============================================================================

-- Enable uuid-ossp extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. Create Submissions Table (if not exists)
create table if not exists public.hotseat_submissions (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  email text not null,
  target_role text,
  resume_url text not null,
  file_name text not null,
  consent_given boolean default true not null,
  status text default 'pending' check (status in ('pending', 'selected', 'reviewed')),
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.hotseat_submissions enable row level security;

-- 2. Drop existing policies to prevent duplicate policy name errors
drop policy if exists "Anyone can submit a resume for Hot Seat" on public.hotseat_submissions;
create policy "Anyone can submit a resume for Hot Seat"
  on public.hotseat_submissions for insert
  with check (true);

drop policy if exists "Authenticated users can view Hot Seat submissions" on public.hotseat_submissions;
create policy "Authenticated users can view Hot Seat submissions"
  on public.hotseat_submissions for select
  using (true);

drop policy if exists "Authenticated users can update Hot Seat status" on public.hotseat_submissions;
create policy "Authenticated users can update Hot Seat status"
  on public.hotseat_submissions for update
  using (true);

-- =============================================================================
-- NOTE: In Supabase Storage, ensure a public storage bucket named 'resumes' exists.
-- =============================================================================
