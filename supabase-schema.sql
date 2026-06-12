-- ─────────────────────────────────────────────
-- Cinder by Ember — Supabase Schema
-- Run this in Supabase SQL Editor
-- ─────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ── Classes ──────────────────────────────────
create table if not exists classes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  code       text unique not null,  -- enrollment code e.g. FALL2026-NET101
  created_at timestamptz default now()
);

-- ── Profiles (no PII — alias only) ───────────
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  alias      text not null,
  role       text not null default 'student', -- 'student' | 'admin'
  class_id   uuid references classes(id),
  created_at timestamptz default now()
);

-- ── Ticket Templates ─────────────────────────
-- Stores the scenario/ticket definitions (replaces seeds.js)
create table if not exists ticket_templates (
  id          text primary key,  -- e.g. "SCN-001"
  title       text not null,
  description text,
  priority    text default 'Medium',
  categories  text[] default '{}',
  week_tag    text,              -- e.g. "Week 3 - VLANs"
  scenario    jsonb default '{}'
);

-- ── Lab Assignments (weekly push events) ─────
create table if not exists lab_assignments (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid references classes(id) on delete cascade,
  week_label  text not null,
  assigned_by uuid references profiles(id),
  assigned_at timestamptz default now()
);

-- ── Assigned Tickets (student ↔ ticket) ──────
create table if not exists assigned_tickets (
  id             uuid primary key default gen_random_uuid(),
  assignment_id  uuid references lab_assignments(id) on delete cascade,
  student_id     uuid references profiles(id) on delete cascade,
  group_tag      text,           -- null = individual; set to group name for group weeks
  template_id    text references ticket_templates(id),
  status         text default 'Open',
  notes          jsonb default '[]',
  created_at     timestamptz default now(),
  resolved_at    timestamptz
);

-- ── Lab Notes (student documentation) ────────
create table if not exists lab_notes (
  id                 uuid primary key default gen_random_uuid(),
  assigned_ticket_id uuid references assigned_tickets(id) on delete cascade,
  student_id         uuid references profiles(id) on delete cascade,
  content            text default '',
  updated_at         timestamptz default now()
);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────

alter table classes          enable row level security;
alter table profiles         enable row level security;
alter table ticket_templates enable row level security;
alter table lab_assignments  enable row level security;
alter table assigned_tickets enable row level security;
alter table lab_notes        enable row level security;

-- profiles: users can read their own; admins can read all in their class
create policy "profiles: own read"
  on profiles for select
  using (auth.uid() = id);

create policy "profiles: admin read class"
  on profiles for select
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.class_id = profiles.class_id
    )
  );

create policy "profiles: insert own"
  on profiles for insert
  with check (auth.uid() = id);

create policy "profiles: update own"
  on profiles for update
  using (auth.uid() = id);

-- classes: anyone authenticated can read (needed to validate enrollment code)
create policy "classes: authenticated read"
  on classes for select
  using (auth.role() = 'authenticated');

create policy "classes: admin insert"
  on classes for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ticket_templates: readable by all authenticated users
create policy "templates: authenticated read"
  on ticket_templates for select
  using (auth.role() = 'authenticated');

create policy "templates: admin write"
  on ticket_templates for all
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- lab_assignments: students see their class; admins manage
create policy "assignments: student read"
  on lab_assignments for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and class_id = lab_assignments.class_id
    )
  );

create policy "assignments: admin write"
  on lab_assignments for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin' and class_id = lab_assignments.class_id
    )
  );

-- assigned_tickets: students see own; admins see class
create policy "assigned_tickets: student read own"
  on assigned_tickets for select
  using (student_id = auth.uid());

create policy "assigned_tickets: student update own"
  on assigned_tickets for update
  using (student_id = auth.uid());

create policy "assigned_tickets: admin all"
  on assigned_tickets for all
  using (
    exists (
      select 1 from profiles p
      join lab_assignments la on la.class_id = p.class_id
      where p.id = auth.uid() and p.role = 'admin'
        and la.id = assigned_tickets.assignment_id
    )
  );

-- lab_notes: students own their notes; admins can read class notes
create policy "lab_notes: student own"
  on lab_notes for all
  using (student_id = auth.uid());

create policy "lab_notes: admin read"
  on lab_notes for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
