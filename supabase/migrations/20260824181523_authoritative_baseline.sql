-- Issue #9: authoritative, idempotent Cinder database baseline.
--
-- This migration is safe for both a fresh Supabase project and the existing
-- production project. It creates or completes every application table before
-- the ordered authorization/enrollment migrations run. Historical patch files
-- are documentation only and are not part of the active migration path.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

-- ---------------------------------------------------------------------------
-- Classroom tables
-- ---------------------------------------------------------------------------

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  course_id text,
  quarter text,
  year integer,
  login_key uuid not null default gen_random_uuid(),
  enrollment_open boolean not null default true,
  code_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  alias text not null,
  role text not null default 'student',
  cohort text default 'net-hw',
  class_id uuid references public.classes(id),
  reset_pin text,
  created_at timestamptz not null default now()
);

create table if not exists public.profile_classes (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  primary key (profile_id, class_id)
);

create table if not exists public.ticket_templates (
  id text primary key,
  title text not null,
  description text,
  priority text not null default 'Medium',
  categories text[] not null default '{}',
  week_tag text,
  scenario jsonb not null default '{}',
  course_id text,
  week integer,
  mode text not null default 'broadcast'
);

create table if not exists public.lab_assignments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  week_label text not null,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now()
);

create table if not exists public.assigned_tickets (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.lab_assignments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  group_tag text,
  scenario_id text,
  course_id text,
  week integer,
  title text not null,
  description text,
  priority text not null default 'Medium',
  status text not null default 'Open',
  notes jsonb not null default '[]',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.lab_notes (
  id uuid primary key default gen_random_uuid(),
  assigned_ticket_id uuid not null references public.assigned_tickets(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now(),
  constraint lab_notes_ticket_student_unique unique (assigned_ticket_id, student_id)
);

-- Complete older installations without requiring any historical patch file.
alter table public.classes add column if not exists course_id text;
alter table public.classes add column if not exists quarter text;
alter table public.classes add column if not exists year integer;
alter table public.classes add column if not exists login_key uuid default gen_random_uuid();
alter table public.classes add column if not exists enrollment_open boolean default true;
alter table public.classes add column if not exists code_expires_at timestamptz;

alter table public.profiles add column if not exists cohort text default 'net-hw';
alter table public.profiles add column if not exists class_id uuid references public.classes(id);
alter table public.profiles add column if not exists reset_pin text;

alter table public.ticket_templates add column if not exists course_id text;
alter table public.ticket_templates add column if not exists week integer;
alter table public.ticket_templates add column if not exists mode text default 'broadcast';
alter table public.ticket_templates add column if not exists categories text[] default '{}';
alter table public.ticket_templates add column if not exists scenario jsonb default '{}';

alter table public.assigned_tickets add column if not exists group_tag text;
alter table public.assigned_tickets add column if not exists scenario_id text;
alter table public.assigned_tickets add column if not exists course_id text;
alter table public.assigned_tickets add column if not exists week integer;
alter table public.assigned_tickets add column if not exists title text;
alter table public.assigned_tickets add column if not exists description text;
alter table public.assigned_tickets add column if not exists priority text default 'Medium';
alter table public.assigned_tickets add column if not exists status text default 'Open';
alter table public.assigned_tickets add column if not exists notes jsonb default '[]';
alter table public.assigned_tickets add column if not exists resolved_at timestamptz;

update public.classes set login_key = gen_random_uuid() where login_key is null;
update public.classes set enrollment_open = true where enrollment_open is null;
update public.profiles set role = 'student' where role is null;
update public.ticket_templates set priority = 'Medium' where priority is null;
update public.ticket_templates set categories = '{}' where categories is null;
update public.ticket_templates set scenario = '{}' where scenario is null;
update public.ticket_templates set mode = 'broadcast' where mode is null;
update public.assigned_tickets set priority = 'Medium' where priority is null;
update public.assigned_tickets set status = 'Open' where status is null;
update public.assigned_tickets set notes = '[]' where notes is null;

alter table public.classes alter column login_key set default gen_random_uuid();
alter table public.classes alter column login_key set not null;
alter table public.classes alter column enrollment_open set default true;
alter table public.classes alter column enrollment_open set not null;
alter table public.profiles alter column role set default 'student';
alter table public.profiles alter column role set not null;
alter table public.ticket_templates alter column priority set default 'Medium';
alter table public.ticket_templates alter column priority set not null;
alter table public.ticket_templates alter column categories set default '{}';
alter table public.ticket_templates alter column categories set not null;
alter table public.ticket_templates alter column scenario set default '{}';
alter table public.ticket_templates alter column scenario set not null;
alter table public.ticket_templates alter column mode set default 'broadcast';
alter table public.ticket_templates alter column mode set not null;
alter table public.assigned_tickets alter column priority set default 'Medium';
alter table public.assigned_tickets alter column priority set not null;
alter table public.assigned_tickets alter column status set default 'Open';
alter table public.assigned_tickets alter column status set not null;
alter table public.assigned_tickets alter column notes set default '[]';
alter table public.assigned_tickets alter column notes set not null;

-- ---------------------------------------------------------------------------
-- Domain constraints
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_role_check') then
    alter table public.profiles add constraint profiles_role_check
      check (role in ('student', 'tech', 'admin')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'classes_course_check') then
    alter table public.classes add constraint classes_course_check
      check (course_id is null or course_id in ('net', 'hw', 'cyber')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'classes_quarter_check') then
    alter table public.classes add constraint classes_quarter_check
      check (quarter is null or quarter in ('Fall', 'Winter', 'Spring', 'Summer')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'classes_year_check') then
    alter table public.classes add constraint classes_year_check
      check (year is null or year between 2020 and 2100) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'templates_course_check') then
    alter table public.ticket_templates add constraint templates_course_check
      check (course_id is null or course_id in ('net', 'hw', 'cyber')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'templates_priority_check') then
    alter table public.ticket_templates add constraint templates_priority_check
      check (priority in ('Low', 'Medium', 'High', 'Critical')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'templates_mode_check') then
    alter table public.ticket_templates add constraint templates_mode_check
      check (mode in ('broadcast', 'individual', 'pairs', 'teams')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'templates_week_check') then
    alter table public.ticket_templates add constraint templates_week_check
      check (week is null or week between 1 and 20) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'assigned_tickets_course_check') then
    alter table public.assigned_tickets add constraint assigned_tickets_course_check
      check (course_id is null or course_id in ('net', 'hw', 'cyber')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'assigned_tickets_priority_check') then
    alter table public.assigned_tickets add constraint assigned_tickets_priority_check
      check (priority in ('Low', 'Medium', 'High', 'Critical')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'assigned_tickets_status_check') then
    alter table public.assigned_tickets add constraint assigned_tickets_status_check
      check (status in ('Open', 'In Progress', 'Resolved', 'Closed')) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'assigned_tickets_week_check') then
    alter table public.assigned_tickets add constraint assigned_tickets_week_check
      check (week is null or week between 1 and 20) not valid;
  end if;
end;
$$;

alter table public.profiles validate constraint profiles_role_check;
alter table public.classes validate constraint classes_course_check;
-- Preserve legacy class rows during an upgrade while enforcing the constraint
-- for every new or changed row. Fresh databases validate it immediately.
do $$
begin
  if not exists (
    select 1
    from public.classes
    where quarter is not null
      and quarter not in ('Fall', 'Winter', 'Spring', 'Summer')
  ) then
    alter table public.classes validate constraint classes_quarter_check;
  end if;
end;
$$;
alter table public.classes validate constraint classes_year_check;
alter table public.ticket_templates validate constraint templates_course_check;
alter table public.ticket_templates validate constraint templates_priority_check;
alter table public.ticket_templates validate constraint templates_mode_check;
alter table public.ticket_templates validate constraint templates_week_check;
alter table public.assigned_tickets validate constraint assigned_tickets_course_check;
alter table public.assigned_tickets validate constraint assigned_tickets_priority_check;
alter table public.assigned_tickets validate constraint assigned_tickets_status_check;
alter table public.assigned_tickets validate constraint assigned_tickets_week_check;

create unique index if not exists classes_login_key_idx on public.classes(login_key);
create index if not exists profile_classes_class_idx on public.profile_classes(class_id);
create index if not exists assigned_tickets_student_id_idx on public.assigned_tickets(student_id);
create index if not exists lab_assignments_class_id_idx on public.lab_assignments(class_id);
create index if not exists lab_notes_student_id_idx on public.lab_notes(student_id);

-- ---------------------------------------------------------------------------
-- Shared knowledge base
-- ---------------------------------------------------------------------------

create or replace function private.is_kb_reviewer()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1 from public.profiles
      where id = (select auth.uid())
        and role in ('admin', 'tech')
    );
$$;

revoke all on function private.is_kb_reviewer() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_kb_reviewer() to authenticated;

create table if not exists public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null check (char_length(title) between 1 and 180),
  course_id text,
  category text not null default 'General',
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'changes_requested', 'published', 'archived')),
  author_id uuid not null references public.profiles(id) on delete restrict,
  reviewer_id uuid references public.profiles(id) on delete set null,
  body text not null default '',
  tags text[] not null default '{}',
  review_notes text,
  source_type text,
  source_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  published_at timestamptz
);

create table if not exists public.knowledge_article_revisions (
  id bigint generated by default as identity primary key,
  article_id uuid not null references public.knowledge_articles(id) on delete cascade,
  editor_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  body text not null,
  tags text[] not null default '{}',
  status text not null,
  change_summary text not null default 'Article updated',
  created_at timestamptz not null default now()
);

create index if not exists knowledge_articles_author_idx on public.knowledge_articles(author_id);
create index if not exists knowledge_articles_reviewer_idx on public.knowledge_articles(reviewer_id);
create index if not exists knowledge_articles_status_idx on public.knowledge_articles(status);
create index if not exists knowledge_articles_course_idx on public.knowledge_articles(course_id);
create index if not exists knowledge_article_revisions_article_idx
  on public.knowledge_article_revisions(article_id, created_at desc);
create index if not exists knowledge_article_revisions_editor_idx
  on public.knowledge_article_revisions(editor_id);

create or replace function public.set_knowledge_article_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_knowledge_article_updated_at() from public, anon, authenticated;

drop trigger if exists set_knowledge_article_updated_at on public.knowledge_articles;
create trigger set_knowledge_article_updated_at
before update on public.knowledge_articles
for each row execute function public.set_knowledge_article_updated_at();

alter table public.classes enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_classes enable row level security;
alter table public.ticket_templates enable row level security;
alter table public.lab_assignments enable row level security;
alter table public.assigned_tickets enable row level security;
alter table public.lab_notes enable row level security;
alter table public.knowledge_articles enable row level security;
alter table public.knowledge_article_revisions enable row level security;

revoke all on table public.knowledge_articles from anon, authenticated;
revoke all on table public.knowledge_article_revisions from anon, authenticated;
grant select, insert, update, delete on table public.knowledge_articles to authenticated;
grant select, insert on table public.knowledge_article_revisions to authenticated;
grant usage, select on sequence public.knowledge_article_revisions_id_seq to authenticated;

drop policy if exists "Read published articles, own drafts, or review queue" on public.knowledge_articles;
drop policy if exists "Students create their own drafts and submissions" on public.knowledge_articles;
drop policy if exists "Reviewers create articles" on public.knowledge_articles;
drop policy if exists "Create owned drafts or reviewer articles" on public.knowledge_articles;
drop policy if exists "Students update their editable articles" on public.knowledge_articles;
drop policy if exists "Reviewers update all articles" on public.knowledge_articles;
drop policy if exists "Update owned editable articles or review articles" on public.knowledge_articles;
drop policy if exists "Students delete their own drafts" on public.knowledge_articles;
drop policy if exists "Reviewers delete articles" on public.knowledge_articles;
drop policy if exists "Delete owned drafts or reviewer articles" on public.knowledge_articles;
drop policy if exists "Authors and reviewers read revision history" on public.knowledge_article_revisions;
drop policy if exists "Authors and reviewers add revisions" on public.knowledge_article_revisions;

create policy "Read published articles, own drafts, or review queue"
on public.knowledge_articles for select
to authenticated
using (
  status = 'published'
  or author_id = (select auth.uid())
  or (select private.is_kb_reviewer())
);

create policy "Create owned drafts or reviewer articles"
on public.knowledge_articles for insert
to authenticated
with check (
  (select private.is_kb_reviewer())
  or (
    author_id = (select auth.uid())
    and status in ('draft', 'submitted')
    and reviewer_id is null
    and review_notes is null
    and published_at is null
  )
);

create policy "Update owned editable articles or review articles"
on public.knowledge_articles for update
to authenticated
using (
  (select private.is_kb_reviewer())
  or (author_id = (select auth.uid()) and status in ('draft', 'changes_requested'))
)
with check (
  (select private.is_kb_reviewer())
  or (
    author_id = (select auth.uid())
    and status in ('draft', 'submitted')
    and reviewer_id is null
    and published_at is null
  )
);

create policy "Delete owned drafts or reviewer articles"
on public.knowledge_articles for delete
to authenticated
using (
  (select private.is_kb_reviewer())
  or (author_id = (select auth.uid()) and status = 'draft')
);

create policy "Authors and reviewers read revision history"
on public.knowledge_article_revisions for select
to authenticated
using (
  editor_id = (select auth.uid())
  or exists (
    select 1 from public.knowledge_articles article
    where article.id = article_id
      and article.author_id = (select auth.uid())
  )
  or (select private.is_kb_reviewer())
);

create policy "Authors and reviewers add revisions"
on public.knowledge_article_revisions for insert
to authenticated
with check (
  editor_id = (select auth.uid())
  and (
    exists (
      select 1 from public.knowledge_articles article
      where article.id = article_id
        and article.author_id = (select auth.uid())
    )
    or (select private.is_kb_reviewer())
  )
);
