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
-- STORAGE BUCKETS CONFIGURATION (ensure 'resumes' bucket exists with public access)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public) 
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can download resumes" ON storage.objects;
CREATE POLICY "Anyone can download resumes" ON storage.objects
  FOR SELECT USING (bucket_id = 'resumes');

DROP POLICY IF EXISTS "Anyone can upload resumes" ON storage.objects;
CREATE POLICY "Anyone can upload resumes" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'resumes');

DROP POLICY IF EXISTS "Mentors can manage resumes" ON storage.objects;
CREATE POLICY "Mentors can manage resumes" ON storage.objects
  FOR ALL USING (
    bucket_id = 'resumes' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'mentor'
    )
  );

-- =============================================================================
-- 3. LIVE SESSIONS TABLE & POLICIES
-- =============================================================================
create table if not exists public.hotseat_live_sessions (
  id uuid default gen_random_uuid() primary key,
  title text not null default 'Resume Hot Seat Live',
  live_datetime timestamp with time zone not null,
  stream_link text,
  max_spots integer default 3 not null,
  notes text,
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.hotseat_live_sessions enable row level security;

drop policy if exists "Anyone can read live sessions" on public.hotseat_live_sessions;
create policy "Anyone can read live sessions"
  on public.hotseat_live_sessions for select
  using (true);

drop policy if exists "Authenticated users can insert live sessions" on public.hotseat_live_sessions;
create policy "Authenticated users can insert live sessions"
  on public.hotseat_live_sessions for insert
  with check (true);

drop policy if exists "Authenticated users can update live sessions" on public.hotseat_live_sessions;
create policy "Authenticated users can update live sessions"
  on public.hotseat_live_sessions for update
  using (true);
