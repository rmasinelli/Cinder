-- Issue #7: lock down classroom authorization boundaries.
--
-- Students must never be able to choose protected ownership, role, reset,
-- enrollment, or assignment fields through the Data API. Student writes that
-- need to cross those boundaries are exposed as narrow RPCs which derive the
-- caller from auth.uid().

create schema if not exists private;
revoke all on schema private from public, anon;

-- RLS helper. It must bypass profiles RLS to avoid recursion, so keep it in a
-- non-exposed schema and pin search_path. Authenticated users may execute it
-- only as an RLS predicate; the private schema is not exposed through the API.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'admin'
    );
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

alter table public.classes enable row level security;
alter table public.profiles enable row level security;
alter table public.profile_classes enable row level security;
alter table public.ticket_templates enable row level security;
alter table public.lab_assignments enable row level security;
alter table public.assigned_tickets enable row level security;
alter table public.lab_notes enable row level security;

-- Remove every legacy policy on the classroom tables before rebuilding the
-- access matrix with explicit operations, roles, USING, and WITH CHECK rules.
-- Production has accumulated policy names from several one-off patches, so
-- enumerate the target tables instead of relying only on historical names.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select tablename, policyname
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in (
        'classes',
        'profiles',
        'profile_classes',
        'ticket_templates',
        'lab_assignments',
        'assigned_tickets',
        'lab_notes'
      )
  loop
    execute format(
      'drop policy if exists %I on public.%I',
      existing_policy.policyname,
      existing_policy.tablename
    );
  end loop;
end;
$$;

drop policy if exists "classes: public read" on public.classes;
drop policy if exists "classes: admin insert" on public.classes;

drop policy if exists "profiles: own read" on public.profiles;
drop policy if exists "profiles: admin read" on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;

drop policy if exists "profile_classes: own read" on public.profile_classes;
drop policy if exists "profile_classes: own insert" on public.profile_classes;
drop policy if exists "profile_classes: admin read" on public.profile_classes;
drop policy if exists "profile_classes: admin insert" on public.profile_classes;

drop policy if exists "templates: read all" on public.ticket_templates;
drop policy if exists "templates: admin write" on public.ticket_templates;
drop policy if exists "templates: admin insert" on public.ticket_templates;
drop policy if exists "templates: admin update" on public.ticket_templates;
drop policy if exists "templates: admin delete" on public.ticket_templates;

drop policy if exists "assignments: student read" on public.lab_assignments;
drop policy if exists "assignments: admin insert" on public.lab_assignments;
drop policy if exists "assignments: admin select" on public.lab_assignments;
drop policy if exists "lab_assignments: admin delete" on public.lab_assignments;

drop policy if exists "assigned_tickets: student read" on public.assigned_tickets;
drop policy if exists "assigned_tickets: student update" on public.assigned_tickets;
drop policy if exists "assigned_tickets: admin insert" on public.assigned_tickets;
drop policy if exists "assigned_tickets: admin select" on public.assigned_tickets;
drop policy if exists "assigned_tickets: admin update" on public.assigned_tickets;
drop policy if exists "assigned_tickets: admin delete" on public.assigned_tickets;

drop policy if exists "lab_notes: student own" on public.lab_notes;
drop policy if exists "lab_notes: admin read" on public.lab_notes;
drop policy if exists "lab_notes: admin delete" on public.lab_notes;

-- Data API grants are separate from RLS. Start from no classroom-table access,
-- then grant only the operations for which a policy exists.
revoke all on table public.classes from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.profile_classes from anon, authenticated;
revoke all on table public.ticket_templates from anon, authenticated;
revoke all on table public.lab_assignments from anon, authenticated;
revoke all on table public.assigned_tickets from anon, authenticated;
revoke all on table public.lab_notes from anon, authenticated;

grant select on table public.classes to anon;
grant select, insert, update, delete on table public.classes to authenticated;
grant select, update on table public.profiles to authenticated;
grant select, insert, delete on table public.profile_classes to authenticated;
grant select, insert, update, delete on table public.ticket_templates to authenticated;
grant select, insert, delete on table public.lab_assignments to authenticated;
grant select, insert, update, delete on table public.assigned_tickets to authenticated;
grant select, delete on table public.lab_notes to authenticated;

-- Classes remain readable for the current join flow. Hiding enrollment codes is
-- tracked separately in Issue #8; no class write is available to students.
create policy "classes: read for enrollment"
on public.classes for select
to anon, authenticated
using (true);

create policy "classes: admin insert"
on public.classes for insert
to authenticated
with check ((select private.is_admin()));

create policy "classes: admin update"
on public.classes for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "classes: admin delete"
on public.classes for delete
to authenticated
using ((select private.is_admin()));

-- Students can read their own profile but cannot directly insert or update it.
-- Admin updates are retained for instructor operations.
create policy "profiles: own read"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles: admin read"
on public.profiles for select
to authenticated
using ((select private.is_admin()));

create policy "profiles: admin update"
on public.profiles for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "profile_classes: own read"
on public.profile_classes for select
to authenticated
using (profile_id = (select auth.uid()));

create policy "profile_classes: admin read"
on public.profile_classes for select
to authenticated
using ((select private.is_admin()));

create policy "profile_classes: admin insert"
on public.profile_classes for insert
to authenticated
with check ((select private.is_admin()));

create policy "profile_classes: admin delete"
on public.profile_classes for delete
to authenticated
using ((select private.is_admin()));

-- Templates are course content: authenticated users read; admins author.
create policy "templates: authenticated read"
on public.ticket_templates for select
to authenticated
using (true);

create policy "templates: admin insert"
on public.ticket_templates for insert
to authenticated
with check ((select private.is_admin()));

create policy "templates: admin update"
on public.ticket_templates for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "templates: admin delete"
on public.ticket_templates for delete
to authenticated
using ((select private.is_admin()));

-- Students can see an assignment only when enrolled in its class. This supports
-- the profile_classes junction table rather than relying on legacy class_id.
create policy "assignments: enrolled student read"
on public.lab_assignments for select
to authenticated
using (
  exists (
    select 1
    from public.profile_classes pc
    where pc.profile_id = (select auth.uid())
      and pc.class_id = lab_assignments.class_id
  )
);

create policy "assignments: admin read"
on public.lab_assignments for select
to authenticated
using ((select private.is_admin()));

create policy "assignments: admin insert"
on public.lab_assignments for insert
to authenticated
with check ((select private.is_admin()));

create policy "assignments: admin delete"
on public.lab_assignments for delete
to authenticated
using ((select private.is_admin()));

-- Students read only their tickets. Status changes use the narrow RPC below;
-- there is deliberately no direct student UPDATE policy.
create policy "assigned_tickets: student read"
on public.assigned_tickets for select
to authenticated
using (student_id = (select auth.uid()));

create policy "assigned_tickets: admin read"
on public.assigned_tickets for select
to authenticated
using ((select private.is_admin()));

create policy "assigned_tickets: admin insert"
on public.assigned_tickets for insert
to authenticated
with check ((select private.is_admin()));

create policy "assigned_tickets: admin update"
on public.assigned_tickets for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "assigned_tickets: admin delete"
on public.assigned_tickets for delete
to authenticated
using ((select private.is_admin()));

-- Students read their own notes. Writes go through save_my_lab_note so the
-- browser can never choose student_id or retarget another student's note.
create policy "lab_notes: student read"
on public.lab_notes for select
to authenticated
using (
  student_id = (select auth.uid())
  and exists (
    select 1
    from public.assigned_tickets ticket
    where ticket.id = lab_notes.assigned_ticket_id
      and ticket.student_id = (select auth.uid())
  )
);

create policy "lab_notes: admin read"
on public.lab_notes for select
to authenticated
using ((select private.is_admin()));

create policy "lab_notes: admin delete"
on public.lab_notes for delete
to authenticated
using ((select private.is_admin()));

-- Atomic first-login setup. This function works only once per authenticated
-- user and forces the role/reset/ownership values on the server. Class-code
-- secrecy and rotation are handled by Issue #8.
create or replace function public.complete_student_enrollment(
  p_alias text,
  p_primary_class_id uuid,
  p_class_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_alias text := trim(p_alias);
  v_requested_count integer;
  v_existing_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if v_alias = '' or length(v_alias) > 50 then
    raise exception 'invalid_alias' using errcode = '22023';
  end if;

  if p_class_ids is null
     or cardinality(p_class_ids) < 1
     or cardinality(p_class_ids) > 3
     or not (p_primary_class_id = any(p_class_ids)) then
    raise exception 'invalid_class_selection' using errcode = '22023';
  end if;

  if exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'profile_already_exists' using errcode = '23505';
  end if;

  select count(distinct requested.class_id), count(classes.id)
  into v_requested_count, v_existing_count
  from unnest(p_class_ids) requested(class_id)
  left join public.classes classes on classes.id = requested.class_id;

  if v_requested_count <> cardinality(p_class_ids)
     or v_existing_count <> cardinality(p_class_ids) then
    raise exception 'invalid_class_selection' using errcode = '22023';
  end if;

  insert into public.profiles (id, alias, role, class_id, reset_pin)
  values (v_user_id, v_alias, 'student', p_primary_class_id, null);

  insert into public.profile_classes (profile_id, class_id)
  select v_user_id, requested.class_id
  from unnest(p_class_ids) requested(class_id);
end;
$$;

revoke all on function public.complete_student_enrollment(text, uuid, uuid[])
  from public, anon, authenticated;
grant execute on function public.complete_student_enrollment(text, uuid, uuid[])
  to authenticated;

create or replace function public.update_my_assigned_ticket_status(
  p_ticket_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if p_status not in ('Open', 'In Progress', 'Resolved', 'Closed') then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  update public.assigned_tickets
  set status = p_status,
      resolved_at = case
        when p_status in ('Resolved', 'Closed') then now()
        else null
      end
  where id = p_ticket_id
    and student_id = v_user_id;

  if not found then
    raise exception 'ticket_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.update_my_assigned_ticket_status(uuid, text)
  from public, anon, authenticated;
grant execute on function public.update_my_assigned_ticket_status(uuid, text)
  to authenticated;

create or replace function public.save_my_lab_note(
  p_assigned_ticket_id uuid,
  p_content text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.assigned_tickets
    where id = p_assigned_ticket_id
      and student_id = v_user_id
  ) then
    raise exception 'ticket_not_found' using errcode = 'P0002';
  end if;

  insert into public.lab_notes (
    assigned_ticket_id,
    student_id,
    content,
    updated_at
  )
  values (
    p_assigned_ticket_id,
    v_user_id,
    coalesce(p_content, ''),
    now()
  )
  on conflict (assigned_ticket_id, student_id)
  do update set
    content = excluded.content,
    updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.save_my_lab_note(uuid, text)
  from public, anon, authenticated;
grant execute on function public.save_my_lab_note(uuid, text)
  to authenticated;

-- Harden the existing privileged RPCs. SECURITY DEFINER is required because
-- they update protected profile/auth rows or perform an instructor-only reset.
create or replace function public.set_student_reset_pin(
  p_profile_id uuid,
  p_pin text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'invalid_pin' using errcode = '22023';
  end if;

  update public.profiles
  set reset_pin = p_pin
  where id = p_profile_id
    and role = 'student';

  if not found then
    raise exception 'student_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.set_student_reset_pin(uuid, text)
  from public, anon, authenticated;
grant execute on function public.set_student_reset_pin(uuid, text)
  to authenticated;

create or replace function public.reset_student_password(
  p_alias text,
  p_class_code text,
  p_pin text,
  p_new_password text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_class_id uuid;
begin
  if length(p_new_password) < 6 then
    return 'password_too_short';
  end if;

  select id into v_class_id
  from public.classes
  where lower(code) = lower(trim(p_class_code));

  if not found then
    return 'invalid_class';
  end if;

  select profile.id into v_profile_id
  from public.profiles profile
  join public.profile_classes membership on membership.profile_id = profile.id
  where lower(profile.alias) = lower(trim(p_alias))
    and membership.class_id = v_class_id
    and profile.reset_pin = p_pin
  limit 1;

  if not found then
    select id into v_profile_id
    from public.profiles
    where lower(alias) = lower(trim(p_alias))
      and class_id = v_class_id
      and reset_pin = p_pin
    limit 1;
  end if;

  if not found then
    return 'invalid_credentials';
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(
        p_new_password,
        extensions.gen_salt('bf')
      ),
      updated_at = now()
  where id = v_profile_id;

  update public.profiles
  set reset_pin = null
  where id = v_profile_id;

  return 'ok';
end;
$$;

revoke all on function public.reset_student_password(text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.reset_student_password(text, text, text, text)
  to anon, authenticated;

create or replace function public.admin_reset_assigned_tickets()
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  delete from public.lab_notes where true;
  delete from public.assigned_tickets where true;
  delete from public.lab_assignments where true;
end;
$$;

revoke all on function public.admin_reset_assigned_tickets()
  from public, anon, authenticated;
grant execute on function public.admin_reset_assigned_tickets()
  to authenticated;

-- No policy or RPC uses the exposed legacy helper after this migration.
drop function if exists public.is_admin();

-- RLS predicate indexes. The profile_classes primary key starts with
-- profile_id, so it already covers the membership lookup used above.
create index if not exists assigned_tickets_student_id_idx
  on public.assigned_tickets (student_id);
create index if not exists lab_assignments_class_id_idx
  on public.lab_assignments (class_id);
create index if not exists lab_notes_student_id_idx
  on public.lab_notes (student_id);
