-- SabaiJobs database schema
-- Run this in the Supabase SQL editor (Project > SQL Editor > New query)

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  school text not null,
  title text not null,
  city text not null,
  school_type text not null,
  salary text not null,
  visa_sponsorship text not null check (visa_sponsorship in ('yes', 'no')),
  description text,
  contact_email text not null,
  featured boolean default false,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'live', 'expired')),
  stripe_session_id text,
  created_at timestamptz default now(),
  expires_at timestamptz
);

-- Public can read only jobs that are live and not expired
alter table jobs enable row level security;

create policy "Public can read live jobs"
  on jobs for select
  using (status = 'live' and (expires_at is null or expires_at > now()));

-- Inserts happen only from the server (using the service role key), never
-- directly from the browser, so there is no public insert policy here.
-- This is what stops someone from posting a "live" job without paying.

create index if not exists jobs_status_idx on jobs (status);
create index if not exists jobs_city_idx on jobs (city);
