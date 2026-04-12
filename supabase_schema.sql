-- ============================================================
-- MDA Blood Donation Chatbot — Supabase Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ── users table ──────────────────────────────────────────────────────────────
create table if not exists public.users (
  id            uuid primary key default gen_random_uuid(),
  phone_number  text not null,  -- store as-is (app handles input validation)
  created_at    timestamptz not null default now()
);

-- Row Level Security: users can only insert their own row
alter table public.users enable row level security;

create policy "users: anon insert only"
  on public.users
  for insert
  to anon
  with check (true);

-- ── medical_sessions table ────────────────────────────────────────────────────
create table if not exists public.medical_sessions (
  session_id    uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.users(id) on delete cascade,
  answers_log   jsonb not null default '{}'::jsonb,
  final_status  text,   -- one of: זכאות מלאה | זכאות עם אישור | פסילה קבועה | פסילה זמנית | בירור רפואי
  rating        smallint check (rating >= 1 and rating <= 5),
  created_at    timestamptz not null default now()
);

-- Index for quick lookup by user
create index if not exists idx_sessions_user_id on public.medical_sessions(user_id);

-- Row Level Security: anon can insert and update own sessions
alter table public.medical_sessions enable row level security;

create policy "sessions: anon insert"
  on public.medical_sessions
  for insert
  to anon
  with check (true);

create policy "sessions: anon update own"
  on public.medical_sessions
  for update
  to anon
  using (true)
  with check (true);
