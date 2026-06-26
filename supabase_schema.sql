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
