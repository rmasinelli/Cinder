-- Production classes created before quarter metadata was required can contain
-- an empty string. Treat that legacy value the same as NULL (Fall fallback)
-- rather than emitting an undocumented X quarter code.
update public.assigned_tickets
set ticket_number = regexp_replace(
  ticket_number,
  '^([A-Z]{2}-[0-9]{2})X-',
  '\1F-'
)
where ticket_number ~ '^[A-Z]{2}-[0-9]{2}X-[0-9]+$';

create index if not exists ticket_status_history_changed_by_idx
  on public.ticket_status_history (changed_by);

create or replace function private.prepare_classroom_ticket()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course text;
  v_year integer;
  v_quarter text;
begin
  if new.status = 'Open' then
    new.status := 'New';
  end if;

  if new.ticket_number is null then
    select
      coalesce(new.course_id, classes.course_id, 'HW'),
      coalesce(classes.year, extract(year from coalesce(new.created_at, now()))::integer),
      coalesce(nullif(trim(classes.quarter), ''), 'Fall')
    into v_course, v_year, v_quarter
    from public.lab_assignments assignment
    left join public.classes classes on classes.id = assignment.class_id
    where assignment.id = new.assignment_id;

    new.ticket_number := upper(left(coalesce(v_course, 'HW'), 2))
      || '-' || right(coalesce(v_year, extract(year from now())::integer)::text, 2)
      || case v_quarter
          when 'Fall' then 'F'
          when 'Winter' then 'W'
          when 'Spring' then 'S'
          when 'Summer' then 'U'
          else 'F'
        end
      || '-' || lpad(nextval('public.assigned_ticket_number_seq')::text, 4, '0');
  end if;

  return new;
end;
$$;

revoke all on function private.prepare_classroom_ticket() from public;
