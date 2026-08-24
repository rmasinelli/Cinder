-- Restore sign-in for accounts created before profile_classes became the
-- authoritative multi-class membership table. The current class code remains
-- required, and the function still returns only the matching auth email.
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
  join auth.users auth_user on auth_user.id = profile.id
  join public.classes class on (
    class.id = profile.class_id
    or exists (
      select 1
      from public.profile_classes membership
      where membership.profile_id = profile.id
        and membership.class_id = class.id
    )
  )
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
