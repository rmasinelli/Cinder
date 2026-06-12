-- Patch 6: multi-class enrollment + course_id on classes

-- Add course association to classes
alter table classes add column if not exists course_id text; -- 'net' | 'hw' | 'cyber'

-- Junction table: one student can be in multiple classes
create table if not exists profile_classes (
  profile_id uuid references profiles(id) on delete cascade,
  class_id   uuid references classes(id)  on delete cascade,
  primary key (profile_id, class_id)
);

alter table profile_classes enable row level security;

-- Students can read their own memberships
create policy "profile_classes: own read"
  on profile_classes for select
  using (profile_id = auth.uid());

-- Students can insert their own memberships
create policy "profile_classes: own insert"
  on profile_classes for insert
  with check (profile_id = auth.uid());

-- Admins can read all memberships for their class
create policy "profile_classes: admin read"
  on profile_classes for select
  using (is_admin());

-- Admins can insert memberships (for manual enrollment)
create policy "profile_classes: admin insert"
  on profile_classes for insert
  with check (is_admin());
