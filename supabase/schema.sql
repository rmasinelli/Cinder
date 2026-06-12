-- ─────────────────────────────────────────────────────────────
-- Cinder by Ember — Complete Database Schema
-- Run this in Supabase SQL Editor on a fresh project.
-- ─────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ── Tables ───────────────────────────────────────────────────

create table if not exists classes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  code       text unique not null,
  created_at timestamptz default now()
);

create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  alias      text not null,
  role       text not null default 'student',
  cohort     text default 'net-hw',
  class_id   uuid references classes(id),
  created_at timestamptz default now()
);

create table if not exists ticket_templates (
  id          text primary key,
  title       text not null,
  description text,
  priority    text default 'Medium',
  categories  text[] default '{}',
  week_tag    text,
  scenario    jsonb default '{}'
);

create table if not exists lab_assignments (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid references classes(id) on delete cascade,
  week_label  text not null,
  assigned_by uuid references profiles(id),
  assigned_at timestamptz default now()
);

create table if not exists assigned_tickets (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid references lab_assignments(id) on delete cascade,
  student_id    uuid references profiles(id) on delete cascade,
  group_tag     text,
  scenario_id   text,
  course_id     text,
  week          int,
  title         text,
  description   text,
  priority      text default 'Medium',
  status        text default 'Open',
  notes         jsonb default '[]',
  created_at    timestamptz default now(),
  resolved_at   timestamptz
);

create table if not exists lab_notes (
  id                 uuid primary key default gen_random_uuid(),
  assigned_ticket_id uuid references assigned_tickets(id) on delete cascade,
  student_id         uuid references profiles(id) on delete cascade,
  content            text default '',
  updated_at         timestamptz default now(),
  constraint lab_notes_ticket_student_unique unique (assigned_ticket_id, student_id)
);

-- ── Row Level Security ────────────────────────────────────────

alter table classes          enable row level security;
alter table profiles         enable row level security;
alter table ticket_templates enable row level security;
alter table lab_assignments  enable row level security;
alter table assigned_tickets enable row level security;
alter table lab_notes        enable row level security;

-- Helper: non-recursive admin check
create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- classes
create policy "classes: public read"   on classes for select using (true);
create policy "classes: admin insert"  on classes for insert with check (is_admin());

-- profiles
create policy "profiles: own read"     on profiles for select using (auth.uid() = id);
create policy "profiles: admin read"   on profiles for select using (is_admin());
create policy "profiles: insert own"   on profiles for insert with check (auth.uid() = id);
create policy "profiles: update own"   on profiles for update using (auth.uid() = id);

-- ticket_templates
create policy "templates: read all"    on ticket_templates for select using (auth.role() = 'authenticated');
create policy "templates: admin write" on ticket_templates for all using (is_admin());

-- lab_assignments
create policy "assignments: student read" on lab_assignments for select using (
  exists (select 1 from profiles where id = auth.uid() and class_id = lab_assignments.class_id)
);
create policy "assignments: admin insert" on lab_assignments for insert with check (is_admin());
create policy "assignments: admin select" on lab_assignments for select using (is_admin());

-- assigned_tickets
create policy "assigned_tickets: student read"   on assigned_tickets for select using (student_id = auth.uid());
create policy "assigned_tickets: student update" on assigned_tickets for update using (student_id = auth.uid());
create policy "assigned_tickets: admin insert"   on assigned_tickets for insert with check (is_admin());
create policy "assigned_tickets: admin select"   on assigned_tickets for select using (is_admin());
create policy "assigned_tickets: admin update"   on assigned_tickets for update using (is_admin());

-- lab_notes
create policy "lab_notes: student own" on lab_notes for all using (student_id = auth.uid());
create policy "lab_notes: admin read"  on lab_notes for select using (is_admin());
