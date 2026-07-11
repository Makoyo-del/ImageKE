-- =============================================================================
-- HOOKBUNKER DATABASE SCHEMA MIGRATION
-- Run this in your Supabase SQL Editor to create all required tables.
-- =============================================================================

-- Enable uuid-ossp extension if not enabled
create extension if not exists "uuid-ossp";

-- 1. Create Profiles Table (Billing & Account details)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  subscription_tier text default 'free' check (subscription_tier in ('free', 'team', 'business')),
  subscription_status text default 'active',
  paystack_customer_code text,
  paystack_subscription_code text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) on Profiles
alter table public.profiles enable row level security;

-- Profiles Policies
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

-- 2. Trigger: Auto-create Profile row when auth.users row is created
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Remove trigger if it already exists to avoid errors
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 3. Create Projects Table (API Keys & Target URLs)
create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  target_url text not null,
  api_key text unique not null,
  active boolean default true not null,
  max_retries integer default 5 not null, -- Max delivery retry attempts before stopping (1-10)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Projects
alter table public.projects enable row level security;

-- Projects Policies
drop policy if exists "Users can manage their own projects" on public.projects;
create policy "Users can manage their own projects" 
  on public.projects for all 
  using (auth.uid() = user_id);

-- API keys are looked up by the server backend (which bypasses RLS using service key),
-- so standard users do not need access to other users' api keys.


-- 4. Create Webhooks Table (Captured Transaction Payloads)
create table if not exists public.webhooks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects on delete cascade not null,
  gateway text not null, -- 'mpesa', 'paystack', 'payhero', 'generic'
  payload jsonb not null,
  status text not null, -- 'pending', 'success', 'failed', 'retrying'
  transaction_code text,
  amount numeric,
  phone text,
  email text,
  payment_method text, -- 'card', 'mpesa_stk', 'mpesa_paybill', 'mpesa_till', etc.
  currency text default 'KES', -- 'KES', 'NGN', 'USD', 'GHS', 'ZAR', etc.
  headers jsonb, -- Stores original request signature headers (like x-paystack-signature)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Webhooks
alter table public.webhooks enable row level security;

-- Webhooks Policies
drop policy if exists "Users can view webhooks for their projects" on public.webhooks;
create policy "Users can view webhooks for their projects" 
  on public.webhooks for select 
  using (
    exists (
      select 1 from public.projects 
      where projects.id = webhooks.project_id 
      and projects.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update webhooks for their projects" on public.webhooks;
create policy "Users can update webhooks for their projects" 
  on public.webhooks for update 
  using (
    exists (
      select 1 from public.projects 
      where projects.id = webhooks.project_id 
      and projects.user_id = auth.uid()
    )
  );

-- Allow project owners to delete their own webhook logs (delivery attempts cascade automatically)
drop policy if exists "Users can delete webhooks for their projects" on public.webhooks;
create policy "Users can delete webhooks for their projects"
  on public.webhooks for delete
  using (
    exists (
      select 1 from public.projects
      where projects.id = webhooks.project_id
      and projects.user_id = auth.uid()
    )
  );


-- 5. Create Deliveries Table (Retry & Forward Logs)
create table if not exists public.deliveries (
  id uuid default gen_random_uuid() primary key,
  webhook_id uuid references public.webhooks on delete cascade not null,
  attempt_number integer not null,
  response_status integer,
  response_body text,
  error_message text,
  duration_ms integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Deliveries
alter table public.deliveries enable row level security;

-- Deliveries Policies
drop policy if exists "Users can view deliveries for their webhooks" on public.deliveries;
create policy "Users can view deliveries for their webhooks" 
  on public.deliveries for select 
  using (
    exists (
      select 1 from public.webhooks 
      join public.projects on projects.id = webhooks.project_id
      where webhooks.id = deliveries.webhook_id 
      and projects.user_id = auth.uid()
    )
  );


-- 6. Create Feedback Table (Feature Requests, Ratings, Feedback)
create table if not exists public.feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade, -- Nullable for anonymous
  type text not null check (type in ('feature_request', 'feedback', 'routine_rating')),
  rating integer check (rating >= 1 and rating <= 5), -- 1-5 stars
  title text, -- Optional for feature requests
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Feedback
alter table public.feedback enable row level security;

-- Feedback Policies
drop policy if exists "Users can insert their own feedback" on public.feedback;
create policy "Users can insert their own feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Users can view their own feedback" on public.feedback;
create policy "Users can view their own feedback"
  on public.feedback for select
  using (auth.uid() = user_id);

-- 7. Add Indexes for High-Performance Queries
create index if not exists idx_projects_api_key on public.projects(api_key);
create index if not exists idx_webhooks_project_id on public.webhooks(project_id);
create index if not exists idx_webhooks_status on public.webhooks(status);
create index if not exists idx_webhooks_payment_method on public.webhooks(payment_method);
create index if not exists idx_deliveries_webhook_id on public.deliveries(webhook_id);
create index if not exists idx_feedback_user_id on public.feedback(user_id);
create index if not exists idx_feedback_type on public.feedback(type);

-- =============================================================================
-- MIGRATION: Add currency & headers columns to existing webhooks table (run if upgrading)
-- =============================================================================
alter table public.webhooks add column if not exists currency text default 'KES';
alter table public.webhooks add column if not exists headers jsonb;

-- =============================================================================
-- MIGRATION: Add max_retries to existing projects table (run if upgrading)
-- Default is 5 retries before stopping auto-retry and stopping email alerts.
-- =============================================================================
alter table public.projects add column if not exists max_retries integer default 5;

-- =============================================================================
-- MIGRATION: Add last_payment_reference to profiles table (run if upgrading)
-- Prevents replay attacks where a developer submits the same Paystack reference
-- twice to get a second tier upgrade from a single payment.
-- =============================================================================
alter table public.profiles add column if not exists last_payment_reference text;

-- =============================================================================
-- ACADEMY & MENTORSHIP SYSTEM TABLES & COLUMNS
-- =============================================================================

-- Add role and academy columns to Profiles table
alter table public.profiles add column if not exists role text default 'student' check (role in ('student', 'mentor'));
alter table public.profiles add column if not exists academy_status text default 'inactive' check (academy_status in ('inactive', 'active'));

-- Create Academy Deliverables Table
create table if not exists public.academy_deliverables (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references auth.users on delete cascade not null,
  module_id text not null,
  link text not null,
  notes text,
  status text default 'pending' check (status in ('pending', 'reviewed')),
  feedback text,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Deliverables
alter table public.academy_deliverables enable row level security;

-- Deliverables RLS Policies
drop policy if exists "Students can view their own deliverables" on public.academy_deliverables;
create policy "Students can view their own deliverables"
  on public.academy_deliverables for select
  using (auth.uid() = student_id);

drop policy if exists "Students can insert their own deliverables" on public.academy_deliverables;
create policy "Students can insert their own deliverables"
  on public.academy_deliverables for insert
  with check (auth.uid() = student_id);

-- Create Academy Broadcasts Table (Announcements)
create table if not exists public.academy_broadcasts (
  id uuid default gen_random_uuid() primary key,
  mentor_id uuid references auth.users on delete cascade not null,
  subject text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Broadcasts
alter table public.academy_broadcasts enable row level security;

-- Broadcasts RLS Policies
drop policy if exists "Anyone authenticated can view broadcasts" on public.academy_broadcasts;
create policy "Anyone authenticated can view broadcasts"
  on public.academy_broadcasts for select
  using (auth.uid() is not null);

-- Create Academy Feedback Table (Feature Requests / Feedback)
create table if not exists public.academy_feedback (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references auth.users on delete cascade not null,
  type text not null check (type in ('feedback', 'feature_request')),
  message text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on Academy Feedback
alter table public.academy_feedback enable row level security;

-- Academy Feedback RLS Policies
drop policy if exists "Students can view their own academy feedback" on public.academy_feedback;
create policy "Students can view their own academy feedback"
  on public.academy_feedback for select
  using (auth.uid() = student_id);

drop policy if exists "Students can insert their own academy feedback" on public.academy_feedback;
create policy "Students can insert their own academy feedback"
  on public.academy_feedback for insert
  with check (auth.uid() = student_id);

-- Add indexes for high performance querying
create index if not exists idx_academy_deliverables_student_id on public.academy_deliverables(student_id);
create index if not exists idx_academy_deliverables_module_id on public.academy_deliverables(module_id);
create index if not exists idx_academy_feedback_student_id on public.academy_feedback(student_id);

-- =============================================================================
-- MIGRATION: Add hookbunker_access & academy_access columns
-- =============================================================================
alter table public.profiles add column if not exists hookbunker_access boolean default false;
alter table public.profiles add column if not exists academy_access boolean default false;

-- =============================================================================
-- MIGRATION: Update handle_new_user trigger with access isolation logic
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_admin boolean;
  meta_product text;
  hb_acc boolean;
  acad_acc boolean;
begin
  meta_product := coalesce(new.raw_user_meta_data->>'product', '');
  is_admin := (new.email = 'duncanmakoyo@gmail.com' or new.email = 'makoyoduncan@gmail.com');
  
  if is_admin then
    hb_acc := true;
    acad_acc := true;
  else
    hb_acc := (meta_product = 'hookbunker');
    acad_acc := (meta_product = 'academy');
  end if;

  insert into public.profiles (
    id, 
    email, 
    role,
    academy_status,
    hookbunker_access, 
    academy_access
  )
  values (
    new.id, 
    new.email,
    case when is_admin then 'mentor' else 'student' end,
    case when is_admin then 'active' else 'inactive' end,
    hb_acc,
    acad_acc
  )
  on conflict (id) do update
  set 
    email = excluded.email,
    role = case when is_admin then 'mentor' else profiles.role end,
    academy_status = case when is_admin then 'active' else profiles.academy_status end,
    hookbunker_access = profiles.hookbunker_access or hb_acc,
    academy_access = profiles.academy_access or acad_acc;

  return new;
end;
$$ language plpgsql security definer;

-- =============================================================================
-- MIGRATION: Backfill existing data
-- =============================================================================
-- 1. Upgrade admins
update public.profiles
set 
  role = 'mentor',
  academy_status = 'active',
  hookbunker_access = true,
  academy_access = true
where email in ('duncanmakoyo@gmail.com', 'makoyoduncan@gmail.com');

-- 2. HookBunker users backfill (if they have project rows)
update public.profiles
set hookbunker_access = true
where id in (select user_id from public.projects);

-- 3. Academy users backfill (if they have deliverables or active status)
update public.profiles
set academy_access = true
where academy_status = 'active' or id in (select student_id from public.academy_deliverables);

-- 4. Default fallback: Any profiles that have neither flag set yet get HookBunker access
update public.profiles
set hookbunker_access = true
where hookbunker_access is not true and academy_access is not true;

-- =============================================================================
-- MIGRATION: Add custom email verification, plan tracking, and meeting columns
-- =============================================================================
alter table public.profiles add column if not exists academy_email_verified boolean default false;
alter table public.profiles add column if not exists academy_verification_token text;
alter table public.profiles add column if not exists academy_verification_expires timestamp with time zone;
alter table public.profiles add column if not exists academy_expires_at timestamp with time zone;
alter table public.profiles add column if not exists meeting_link text;
alter table public.profiles add column if not exists meeting_time text;

-- Backfill existing active students/mentors as email-verified
update public.profiles
set academy_email_verified = true
where role = 'mentor' or academy_status = 'active';

-- =============================================================================
-- WORKSHOP REGISTRATIONS SCHEMA MIGRATION
-- =============================================================================
create table if not exists public.workshop_registrations (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  email text not null,
  phone text not null,
  ticket_type text not null check (ticket_type in ('early_bird', 'regular')),
  amount_paid numeric not null,
  payment_reference text unique not null,
  payment_status text not null check (payment_status in ('pending', 'paid', 'failed')) default 'pending',
  attendance_status text not null check (attendance_status in ('absent', 'attended')) default 'absent',
  certificate_sent boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.workshop_registrations enable row level security;

-- Policies
drop policy if exists "Anyone can register for workshop" on public.workshop_registrations;
create policy "Anyone can register for workshop" 
  on public.workshop_registrations for insert 
  with check (true);

drop policy if exists "Anyone can view registration counts" on public.workshop_registrations;
create policy "Anyone can view registration counts" 
  on public.workshop_registrations for select 
  using (payment_status = 'paid');

drop policy if exists "Mentors have full access to workshop registrations" on public.workshop_registrations;
create policy "Mentors have full access to workshop registrations" 
  on public.workshop_registrations for all 
  using (
    exists (
      select 1 from public.profiles 
      where profiles.id = auth.uid() 
      and profiles.role = 'mentor'
    )
  );

-- Indexes for performance
create index if not exists idx_workshop_registrations_email on public.workshop_registrations(email);
create index if not exists idx_workshop_registrations_status on public.workshop_registrations(payment_status);

-- =============================================================================
-- MIGRATION: Free Masterclass Pivot — remove Paystack dependency, add lead fields
-- =============================================================================

-- 1. Relax ticket_type to support 'free' registrations
ALTER TABLE public.workshop_registrations
  DROP CONSTRAINT IF EXISTS workshop_registrations_ticket_type_check;
ALTER TABLE public.workshop_registrations
  ADD CONSTRAINT workshop_registrations_ticket_type_check
  CHECK (ticket_type IN ('early_bird', 'regular', 'free'));

-- 2. Make amount_paid nullable — free registrations have no payment amount
ALTER TABLE public.workshop_registrations
  ALTER COLUMN amount_paid DROP NOT NULL;

-- 3. High-leverage lead-capture qualification columns
ALTER TABLE public.workshop_registrations
  ADD COLUMN IF NOT EXISTS current_profession text,
  ADD COLUMN IF NOT EXISTS biggest_challenge text;

-- 4. registration_status cleanly tracks confirmed vs waitlisted
ALTER TABLE public.workshop_registrations
  ADD COLUMN IF NOT EXISTS registration_status text
  DEFAULT 'confirmed'
  CHECK (registration_status IN ('confirmed', 'waitlist', 'cancelled'));

-- 5. Waitlist overflow table for registrants beyond the 100-seat cap
--    Used to invite them to the NEXT cohort (recurring flywheel).
CREATE TABLE IF NOT EXISTS public.workshop_waitlist (
  id          uuid    DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name   text    NOT NULL,
  email       text    NOT NULL,
  phone       text,
  source      text    DEFAULT 'masterclass_overflow',
  created_at  timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.workshop_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can join waitlist" ON public.workshop_waitlist;
CREATE POLICY "Anyone can join waitlist"
  ON public.workshop_waitlist FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Mentors can view waitlist" ON public.workshop_waitlist;
CREATE POLICY "Mentors can view waitlist"
  ON public.workshop_waitlist FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'mentor'
    )
  );

-- 6. Performance indexes
CREATE INDEX IF NOT EXISTS idx_workshop_reg_status
  ON public.workshop_registrations(registration_status);
CREATE INDEX IF NOT EXISTS idx_workshop_waitlist_email
  ON public.workshop_waitlist(email);

-- =============================================================================
-- RIDER DASHBOARD & FARE COLLECTION SCHEMA
-- =============================================================================

-- 1. Create Riders Table (Managed by Mentors/Admins)
CREATE TABLE IF NOT EXISTS public.riders (
  id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.riders ENABLE ROW LEVEL SECURITY;

-- Only Mentors can manage riders
DROP POLICY IF EXISTS "Mentors can manage riders" ON public.riders;
CREATE POLICY "Mentors can manage riders" 
  ON public.riders FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'mentor'
    )
  );

-- Riders can view their own record
DROP POLICY IF EXISTS "Riders can view own record" ON public.riders;
CREATE POLICY "Riders can view own record" 
  ON public.riders FOR SELECT 
  USING (auth.uid() = id);


-- 2. Create Fare Collections Table
CREATE TABLE IF NOT EXISTS public.fare_collections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  rider_id uuid REFERENCES public.riders(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('mpesa', 'cash')),
  status text NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  passenger_phone text,
  paystack_reference text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.fare_collections ENABLE ROW LEVEL SECURITY;

-- Riders can view their own collections
DROP POLICY IF EXISTS "Riders can view own collections" ON public.fare_collections;
CREATE POLICY "Riders can view own collections" 
  ON public.fare_collections FOR SELECT 
  USING (auth.uid() = rider_id);

-- Riders can insert their own collections
DROP POLICY IF EXISTS "Riders can insert own collections" ON public.fare_collections;
CREATE POLICY "Riders can insert own collections" 
  ON public.fare_collections FOR INSERT 
  WITH CHECK (auth.uid() = rider_id);

-- Add index for fast aggregation
CREATE INDEX IF NOT EXISTS idx_fare_collections_rider_date 
  ON public.fare_collections(rider_id, created_at);

-- Migration: Add email column to public.riders table
ALTER TABLE public.riders ADD COLUMN IF NOT EXISTS email text;
