-- Harden authorization, class enrollment, and instructor-assisted password resets.

-- Profiles are identity and authorization records. Browser clients must not be
-- able to update role or other privileged fields directly.
drop policy if exists "profiles: update own" on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
revoke insert, update on public.profiles from anon, authenticated;

-- Keep the existing policy helper, but remove the mutable search path and the
-- default anonymous execution grant.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Class codes are bearer credentials. Do not expose the complete list through
-- the Data API; callers may only look up an exact code.
drop policy if exists "classes: public read" on public.classes;
drop policy if exists "classes: enrolled read" on public.classes;

create policy "classes: enrolled read"
on public.classes for select
to authenticated
using (
  (select public.is_admin())
  or exists (
    select 1
    from public.profile_classes membership
    where membership.profile_id = (select auth.uid())
      and membership.class_id = classes.id
  )
  or exists (
    select 1
    from public.profiles profile
    where profile.id = (select auth.uid())
      and profile.class_id = classes.id
  )
);

create or replace function public.lookup_class_by_code(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', class.id,
    'name', class.name,
    'code', class.code
  )
  from public.classes class
  where lower(class.code) = lower(trim(p_code))
  limit 1;
$$;

revoke all on function public.lookup_class_by_code(text) from public;
grant execute on function public.lookup_class_by_code(text) to anon, authenticated;

-- Enrollment is atomic: validate every supplied code and alias before creating
-- the profile or any memberships.
create or replace function public.enroll_with_class_codes(
  p_class_codes text[],
  p_alias text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_alias text := trim(p_alias);
  v_codes text[];
  v_class_ids uuid[];
  v_primary_class_id uuid;
  v_existing_alias text;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  if char_length(v_alias) < 2 or char_length(v_alias) > 60 then
    raise exception 'alias must be between 2 and 60 characters';
  end if;

  select array_agg(distinct lower(trim(code)))
    into v_codes
  from unnest(p_class_codes) code
  where trim(code) <> '';

  if coalesce(cardinality(v_codes), 0) = 0 then
    raise exception 'at least one class code is required';
  end if;

  select array_agg(class.id order by code_order.ordinality)
    into v_class_ids
  from unnest(v_codes) with ordinality code_order(code, ordinality)
  join public.classes class
    on lower(class.code) = code_order.code;

  if coalesce(cardinality(v_class_ids), 0) <> cardinality(v_codes) then
    raise exception 'one or more class codes are invalid';
  end if;

  v_primary_class_id := v_class_ids[1];

  if exists (
    select 1
    from public.profiles profile
    left join public.profile_classes membership
      on membership.profile_id = profile.id
    where lower(profile.alias) = lower(v_alias)
      and profile.id <> v_user_id
      and (
        profile.class_id = any(v_class_ids)
        or membership.class_id = any(v_class_ids)
      )
  ) then
    raise exception 'alias is already in use in one of these classes';
  end if;

  select alias
    into v_existing_alias
  from public.profiles
  where id = v_user_id;

  if found and lower(v_existing_alias) <> lower(v_alias) then
    raise exception 'this account already uses a different alias';
  end if;

  insert into public.profiles (id, alias, role, class_id)
  values (v_user_id, v_alias, 'student', v_primary_class_id)
  on conflict (id) do nothing;

  insert into public.profile_classes (profile_id, class_id)
  select v_user_id, class_id
  from unnest(v_class_ids) class_id
  on conflict (profile_id, class_id) do nothing;
end;
$$;

revoke all on function public.enroll_with_class_codes(text[], text) from public, anon;
grant execute on function public.enroll_with_class_codes(text[], text) to authenticated;

-- Direct membership insertion bypasses class-code validation.
drop policy if exists "profile_classes: own insert" on public.profile_classes;

-- Replace reusable four-digit PINs with 192-bit, single-use reset tokens that
-- expire after 15 minutes. Only a digest is retained in the database.
alter table public.profiles
  add column if not exists reset_token_hash bytea,
  add column if not exists reset_token_expires_at timestamptz;

update public.profiles
set reset_pin = null,
    reset_token_hash = null,
    reset_token_expires_at = null
where reset_pin is not null
   or reset_token_hash is not null
   or reset_token_expires_at is not null;

drop function if exists public.set_student_reset_pin(uuid, text);
drop function if exists public.reset_student_password(text, text, text, text);

create or replace function public.create_student_reset_token(p_profile_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');

  update public.profiles
  set reset_token_hash = extensions.digest(v_token, 'sha256'),
      reset_token_expires_at = now() + interval '15 minutes',
      reset_pin = null
  where id = p_profile_id;

  if not found then
    raise exception 'student not found';
  end if;

  return v_token;
end;
$$;

revoke all on function public.create_student_reset_token(uuid) from public, anon;
grant execute on function public.create_student_reset_token(uuid) to authenticated;

create or replace function public.reset_student_password(
  p_alias text,
  p_class_code text,
  p_token text,
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
  if char_length(p_new_password) < 12 then
    return 'password_too_short';
  end if;

  select id
    into v_class_id
  from public.classes
  where lower(code) = lower(trim(p_class_code));

  if not found then
    return 'invalid_credentials';
  end if;

  select profile.id
    into v_profile_id
  from public.profiles profile
  where lower(profile.alias) = lower(trim(p_alias))
    and profile.reset_token_hash = extensions.digest(trim(p_token), 'sha256')
    and profile.reset_token_expires_at > now()
    and (
      profile.class_id = v_class_id
      or exists (
        select 1
        from public.profile_classes membership
        where membership.profile_id = profile.id
          and membership.class_id = v_class_id
      )
    )
  limit 1;

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
  set reset_token_hash = null,
      reset_token_expires_at = null
  where id = v_profile_id;

  return 'ok';
end;
$$;

revoke all on function public.reset_student_password(text, text, text, text) from public;
grant execute on function public.reset_student_password(text, text, text, text)
  to anon, authenticated;

-- Harden the remaining privileged reset function as well.
create or replace function public.admin_reset_assigned_tickets()
returns void
language plpgsql
security definer
set search_path = ''
set row_security = off
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  delete from public.lab_notes where true;
  delete from public.assigned_tickets where true;
  delete from public.lab_assignments where true;
end;
$$;

revoke all on function public.admin_reset_assigned_tickets() from public, anon;
grant execute on function public.admin_reset_assigned_tickets() to authenticated;
