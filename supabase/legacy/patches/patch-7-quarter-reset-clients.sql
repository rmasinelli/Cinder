-- Patch 7: quarter/year on classes, reset_pin on profiles, password reset RPC

-- ── Classes: term tracking ────────────────────────────────────
alter table classes add column if not exists quarter text; -- 'Fall'|'Winter'|'Spring'|'Summer'
alter table classes add column if not exists year    int;

-- ── Profiles: instructor-set reset PIN ───────────────────────
alter table profiles add column if not exists reset_pin text;

-- ── RPC: admin sets a reset PIN for a student ────────────────
-- Security definer so we don't need a separate RLS policy on profiles.reset_pin
create or replace function set_student_reset_pin(p_profile_id uuid, p_pin text)
returns void language plpgsql security definer as $$
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;
  update profiles set reset_pin = p_pin where id = p_profile_id;
end;
$$;

-- Grant execute to authenticated users (is_admin() check is inside)
grant execute on function set_student_reset_pin(uuid, text) to authenticated;

-- ── RPC: student resets their own password using the PIN ──────
-- Verifies alias + class code + PIN, then updates auth.users directly.
-- Requires pgcrypto (already enabled in schema.sql).
create or replace function reset_student_password(
  p_alias      text,
  p_class_code text,
  p_pin        text,
  p_new_password text
) returns text language plpgsql security definer as $$
declare
  v_profile_id uuid;
  v_class_id   uuid;
begin
  if length(p_new_password) < 6 then
    return 'password_too_short';
  end if;

  -- Resolve class code
  select id into v_class_id
    from classes
    where lower(code) = lower(trim(p_class_code));

  if not found then
    return 'invalid_class';
  end if;

  -- Match alias + pin via junction table (post patch-6 accounts)
  select p.id into v_profile_id
    from profiles p
    join profile_classes pc on pc.profile_id = p.id
    where lower(p.alias) = lower(trim(p_alias))
      and pc.class_id = v_class_id
      and p.reset_pin  = p_pin
    limit 1;

  -- Fallback: legacy direct class_id on profile (pre patch-6)
  if not found then
    select id into v_profile_id
      from profiles
      where lower(alias) = lower(trim(p_alias))
        and class_id     = v_class_id
        and reset_pin    = p_pin
      limit 1;
  end if;

  if not found then
    return 'invalid_credentials';
  end if;

  -- Update the Supabase auth user's password
  update auth.users
    set encrypted_password = crypt(p_new_password, gen_salt('bf')),
        updated_at          = now()
    where id = v_profile_id;

  -- Clear PIN so it can't be reused
  update profiles set reset_pin = null where id = v_profile_id;

  return 'ok';
end;
$$;

grant execute on function reset_student_password(text, text, text, text) to anon, authenticated;
