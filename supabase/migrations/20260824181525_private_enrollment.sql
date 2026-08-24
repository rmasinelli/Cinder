-- Issue #8: private, controlled class enrollment.
--
-- Raw class codes are instructor-only. Anonymous callers can validate only an
-- exact set of supplied codes, and enrollment always revalidates those codes
-- on the server. A stable per-class login key decouples student auth identities
-- from rotatable enrollment codes.

alter table public.classes
  add column if not exists login_key uuid default gen_random_uuid();
alter table public.classes
  add column if not exists enrollment_open boolean not null default true;
alter table public.classes
  add column if not exists code_expires_at timestamptz;

update public.classes
set login_key = gen_random_uuid()
where login_key is null;

alter table public.classes
  alter column login_key set default gen_random_uuid();
alter table public.classes
  alter column login_key set not null;

create unique index if not exists classes_login_key_idx
  on public.classes (login_key);
create unique index if not exists profiles_alias_primary_class_idx
  on public.profiles (lower(alias), class_id)
  where role = 'student' and class_id is not null;

drop policy if exists "classes: read for enrollment" on public.classes;
drop policy if exists "classes: public read" on public.classes;
drop policy if exists "classes: admin read" on public.classes;

revoke select on table public.classes from anon;

create policy "classes: admin read"
on public.classes for select
to authenticated
using ((select private.is_admin()));

create or replace function public.get_my_classes()
returns table (
  id uuid,
  name text,
  course_id text,
  quarter text,
  year integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    class.id,
    class.name,
    class.course_id,
    class.quarter,
    class.year
  from public.profile_classes membership
  join public.classes class on class.id = membership.class_id
  where membership.profile_id = (select auth.uid())
  order by class.year desc nulls last, class.quarter, class.name;
$$;

revoke all on function public.get_my_classes()
  from public, anon, authenticated;
grant execute on function public.get_my_classes()
  to authenticated;

-- Exact-code validation for the join screen. It returns sanitized class
-- metadata only when every supplied code is valid, open, unexpired, and
-- distinct. Invalid requests share one generic error and reveal no partial
-- matches or other class rows.
create or replace function public.validate_enrollment_codes(p_codes text[])
returns table (
  id uuid,
  name text,
  course_id text,
  quarter text,
  year integer,
  login_key text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_codes text[];
  v_requested_count integer;
  v_matched_count integer;
begin
  select array_agg(upper(trim(code)) order by ordinal)
  into v_codes
  from unnest(p_codes) with ordinality requested(code, ordinal)
  where trim(code) <> '';

  v_requested_count := coalesce(cardinality(v_codes), 0);

  if v_requested_count < 1 or v_requested_count > 3 then
    raise exception 'invalid_enrollment' using errcode = '22023';
  end if;

  if (select count(distinct requested.code) from unnest(v_codes) requested(code))
     <> v_requested_count then
    raise exception 'invalid_enrollment' using errcode = '22023';
  end if;

  select count(*)
  into v_matched_count
  from public.classes class
  where upper(class.code) = any(v_codes)
    and class.enrollment_open
    and (class.code_expires_at is null or class.code_expires_at > now());

  if v_matched_count <> v_requested_count then
    raise exception 'invalid_enrollment' using errcode = '22023';
  end if;

  return query
  select
    class.id,
    class.name,
    class.course_id,
    class.quarter,
    class.year,
    replace(class.login_key::text, '-', '')
  from unnest(v_codes) with ordinality requested(code, ordinal)
  join public.classes class on upper(class.code) = requested.code
  order by requested.ordinal;
end;
$$;

revoke all on function public.validate_enrollment_codes(text[])
  from public, anon, authenticated;
grant execute on function public.validate_enrollment_codes(text[])
  to anon, authenticated;

-- Resolve an existing student's actual synthetic auth email using a current
-- code for any class in which they are enrolled. This preserves sign-in when
-- an instructor rotates a code even for legacy accounts whose stored email was
-- built from an older code.
create or replace function public.resolve_student_login(
  p_alias text,
  p_class_code text
)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  select auth_user.email
  into v_email
  from public.profiles profile
  join public.profile_classes membership on membership.profile_id = profile.id
  join public.classes class on class.id = membership.class_id
  join auth.users auth_user on auth_user.id = profile.id
  where lower(profile.alias) = lower(trim(p_alias))
    and upper(class.code) = upper(trim(p_class_code))
  limit 1;

  if v_email is null then
    raise exception 'invalid_credentials' using errcode = '28000';
  end if;

  return v_email;
end;
$$;

revoke all on function public.resolve_student_login(text, text)
  from public, anon, authenticated;
grant execute on function public.resolve_student_login(text, text)
  to anon, authenticated;

-- Remove the ID-based enrollment endpoint: accepting class UUIDs would allow
-- callers to bypass code status, expiry, and rotation controls.
drop function if exists public.complete_student_enrollment(text, uuid, uuid[]);

create function public.complete_student_enrollment(
  p_alias text,
  p_class_codes text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_alias text := trim(p_alias);
  v_login_alias text;
  v_codes text[];
  v_primary_class public.classes%rowtype;
  v_requested_count integer;
  v_matched_count integer;
  v_auth_email text;
  v_expected_email text;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  v_login_alias := trim(both '_' from regexp_replace(
    lower(v_alias),
    '[^a-z0-9]+',
    '_',
    'g'
  ));

  if v_alias = '' or length(v_alias) > 50 or v_login_alias = '' then
    raise exception 'invalid_enrollment' using errcode = '22023';
  end if;

  select array_agg(upper(trim(code)) order by ordinal)
  into v_codes
  from unnest(p_class_codes) with ordinality requested(code, ordinal)
  where trim(code) <> '';

  v_requested_count := coalesce(cardinality(v_codes), 0);

  if v_requested_count < 1 or v_requested_count > 3
     or (select count(distinct requested.code) from unnest(v_codes) requested(code))
        <> v_requested_count then
    raise exception 'invalid_enrollment' using errcode = '22023';
  end if;

  select class.*
  into v_primary_class
  from public.classes class
  where upper(class.code) = v_codes[1]
    and class.enrollment_open
    and (class.code_expires_at is null or class.code_expires_at > now());

  select count(*)
  into v_matched_count
  from public.classes class
  where upper(class.code) = any(v_codes)
    and class.enrollment_open
    and (class.code_expires_at is null or class.code_expires_at > now());

  if v_primary_class.id is null or v_matched_count <> v_requested_count then
    raise exception 'invalid_enrollment' using errcode = '22023';
  end if;

  if exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'profile_already_exists' using errcode = '23505';
  end if;

  select email into v_auth_email
  from auth.users
  where id = v_user_id;

  v_expected_email := v_login_alias || '@'
    || replace(v_primary_class.login_key::text, '-', '') || '.cinder.io';

  if lower(coalesce(v_auth_email, '')) <> v_expected_email then
    raise exception 'invalid_enrollment' using errcode = '22023';
  end if;

  insert into public.profiles (id, alias, role, class_id, reset_pin)
  values (v_user_id, v_alias, 'student', v_primary_class.id, null);

  insert into public.profile_classes (profile_id, class_id)
  select v_user_id, class.id
  from unnest(v_codes) requested(code)
  join public.classes class on upper(class.code) = requested.code;
end;
$$;

revoke all on function public.complete_student_enrollment(text, text[])
  from public, anon, authenticated;
grant execute on function public.complete_student_enrollment(text, text[])
  to authenticated;

-- Controlled late-add path for a student joining another current class. It
-- derives ownership from auth.uid(), rejects duplicates, and caps enrollment
-- at three classes to match the first-login workflow.
create or replace function public.add_my_class_by_code(p_class_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_class_id uuid;
begin
  if v_user_id is null
     or not exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'invalid_enrollment' using errcode = '22023';
  end if;

  if (select count(*) from public.profile_classes where profile_id = v_user_id) >= 3 then
    raise exception 'invalid_enrollment' using errcode = '22023';
  end if;

  select id into v_class_id
  from public.classes
  where upper(code) = upper(trim(p_class_code))
    and enrollment_open
    and (code_expires_at is null or code_expires_at > now());

  if v_class_id is null
     or exists (
       select 1 from public.profile_classes
       where profile_id = v_user_id and class_id = v_class_id
     ) then
    raise exception 'invalid_enrollment' using errcode = '22023';
  end if;

  insert into public.profile_classes (profile_id, class_id)
  values (v_user_id, v_class_id);
end;
$$;

revoke all on function public.add_my_class_by_code(text)
  from public, anon, authenticated;
grant execute on function public.add_my_class_by_code(text)
  to authenticated;

create or replace function public.rotate_class_enrollment_code(
  p_class_id uuid,
  p_new_code text,
  p_expires_at timestamptz default null,
  p_enrollment_open boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := upper(trim(p_new_code));
begin
  if not (select private.is_admin()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if v_code !~ '^[A-Z0-9][A-Z0-9-]{7,63}$'
     or (p_expires_at is not null and p_expires_at <= now()) then
    raise exception 'invalid_enrollment_settings' using errcode = '22023';
  end if;

  update public.classes
  set code = v_code,
      code_expires_at = p_expires_at,
      enrollment_open = p_enrollment_open
  where id = p_class_id;

  if not found then
    raise exception 'class_not_found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.rotate_class_enrollment_code(uuid, text, timestamptz, boolean)
  from public, anon, authenticated;
grant execute on function public.rotate_class_enrollment_code(uuid, text, timestamptz, boolean)
  to authenticated;

-- Invalid and expired codes intentionally share the same reset result so the
-- anonymous reset endpoint cannot be used as a class-code oracle.
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
  where upper(code) = upper(trim(p_class_code));

  if not found then
    return 'invalid_credentials';
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

comment on column public.classes.code is
  'Private rotatable enrollment secret; never expose through table SELECT to students or anon.';
comment on column public.classes.login_key is
  'Stable non-secret namespace for synthetic student login emails; rotation-safe.';
