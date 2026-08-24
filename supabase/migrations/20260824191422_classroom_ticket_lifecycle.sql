-- Issue #12: teach an explicit service-desk lifecycle and give every
-- classroom ticket a stable identifier that can also be written in print.

create sequence if not exists public.assigned_ticket_number_seq;

alter table public.assigned_tickets
  add column if not exists ticket_number text;

alter table public.assigned_tickets
  alter column status set default 'New';

alter table public.assigned_tickets
  drop constraint if exists assigned_tickets_status_check;

update public.assigned_tickets
set status = case status
  when 'Open' then 'New'
  when 'Resolved' then 'Verification'
  else status
end;

alter table public.assigned_tickets
  add constraint assigned_tickets_status_check
  check (status in (
    'New', 'Triage', 'In Progress', 'Waiting',
    'Escalated', 'Verification', 'Closed'
  ));

with numbered as (
  select
    ticket.id,
    upper(left(coalesce(ticket.course_id, classes.course_id, 'HW'), 2))
      || '-'
      || right(coalesce(classes.year, extract(year from ticket.created_at)::integer)::text, 2)
      || case coalesce(classes.quarter, 'Fall')
          when 'Fall' then 'F'
          when 'Winter' then 'W'
          when 'Spring' then 'S'
          when 'Summer' then 'U'
          else 'X'
        end
      || '-'
      || lpad(nextval('public.assigned_ticket_number_seq')::text, 4, '0')
      as ticket_number
  from public.assigned_tickets ticket
  left join public.lab_assignments assignment on assignment.id = ticket.assignment_id
  left join public.classes classes on classes.id = assignment.class_id
  where ticket.ticket_number is null
  order by ticket.created_at, ticket.id
)
update public.assigned_tickets ticket
set ticket_number = numbered.ticket_number
from numbered
where ticket.id = numbered.id;

alter table public.assigned_tickets
  alter column ticket_number set not null;

create unique index if not exists assigned_tickets_ticket_number_key
  on public.assigned_tickets (ticket_number);

create table if not exists public.ticket_status_history (
  id bigint generated always as identity primary key,
  assigned_ticket_id uuid not null
    references public.assigned_tickets(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_by_alias text not null,
  changed_at timestamptz not null default now(),
  reopened boolean not null default false,
  constraint ticket_status_history_from_status_check
    check (from_status is null or from_status in (
      'New', 'Triage', 'In Progress', 'Waiting',
      'Escalated', 'Verification', 'Closed'
    )),
  constraint ticket_status_history_to_status_check
    check (to_status in (
      'New', 'Triage', 'In Progress', 'Waiting',
      'Escalated', 'Verification', 'Closed'
    ))
);

create index if not exists ticket_status_history_ticket_time_idx
  on public.ticket_status_history (assigned_ticket_id, changed_at desc);

insert into public.ticket_status_history (
  assigned_ticket_id, from_status, to_status, changed_by, changed_by_alias, changed_at, reopened
)
select id, null, status, null, 'System migration', created_at, false
from public.assigned_tickets
where not exists (
  select 1
  from public.ticket_status_history history
  where history.assigned_ticket_id = assigned_tickets.id
);

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
      coalesce(classes.quarter, 'Fall')
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
          else 'X'
        end
      || '-' || lpad(nextval('public.assigned_ticket_number_seq')::text, 4, '0');
  end if;

  return new;
end;
$$;

revoke all on function private.prepare_classroom_ticket() from public;

drop trigger if exists prepare_classroom_ticket on public.assigned_tickets;
create trigger prepare_classroom_ticket
before insert on public.assigned_tickets
for each row execute function private.prepare_classroom_ticket();

create or replace function private.enforce_classroom_ticket_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if not (case old.status
    when 'New' then new.status in ('Triage')
    when 'Triage' then new.status in ('In Progress', 'Escalated')
    when 'In Progress' then new.status in ('Waiting', 'Escalated', 'Verification')
    when 'Waiting' then new.status in ('In Progress', 'Escalated')
    when 'Escalated' then new.status in ('In Progress', 'Waiting', 'Verification')
    when 'Verification' then new.status in ('In Progress', 'Closed')
    when 'Closed' then new.status in ('Triage')
    else false
  end) then
    raise exception 'invalid_status_transition:%->%', old.status, new.status
      using errcode = '22023';
  end if;

  new.resolved_at := case when new.status = 'Closed' then now() else null end;
  return new;
end;
$$;

revoke all on function private.enforce_classroom_ticket_transition() from public;

drop trigger if exists enforce_classroom_ticket_transition on public.assigned_tickets;
create trigger enforce_classroom_ticket_transition
before update of status on public.assigned_tickets
for each row execute function private.enforce_classroom_ticket_transition();

create or replace function private.record_classroom_ticket_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.ticket_status_history (
      assigned_ticket_id, from_status, to_status, changed_by, changed_by_alias, reopened
    ) values (
      new.id,
      case when tg_op = 'INSERT' then null else old.status end,
      new.status,
      (select auth.uid()),
      coalesce(
        (select profile.alias from public.profiles profile where profile.id = (select auth.uid())),
        'System'
      ),
      tg_op = 'UPDATE' and old.status = 'Closed'
    );
  end if;
  return new;
end;
$$;

revoke all on function private.record_classroom_ticket_status() from public;

drop trigger if exists record_classroom_ticket_status on public.assigned_tickets;
create trigger record_classroom_ticket_status
after insert or update of status on public.assigned_tickets
for each row execute function private.record_classroom_ticket_status();

alter table public.ticket_status_history enable row level security;

drop policy if exists "ticket history: read" on public.ticket_status_history;
create policy "ticket history: read"
on public.ticket_status_history for select
to authenticated
using (
  (select private.is_admin())
  or exists (
      select 1 from public.assigned_tickets ticket
      where ticket.id = assigned_ticket_id
        and ticket.student_id = (select auth.uid())
    )
);

revoke all on table public.ticket_status_history from anon, authenticated;
grant select on table public.ticket_status_history to authenticated;

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

  if p_status not in (
    'New', 'Triage', 'In Progress', 'Waiting',
    'Escalated', 'Verification', 'Closed'
  ) then
    raise exception 'invalid_status' using errcode = '22023';
  end if;

  update public.assigned_tickets
  set status = p_status
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

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ticket_status_history'
  ) then
    alter publication supabase_realtime add table public.ticket_status_history;
  end if;
end;
$$;
