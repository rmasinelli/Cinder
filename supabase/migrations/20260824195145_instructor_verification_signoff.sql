-- Issue #14: give instructors a durable, auditable verification queue.
-- Review events are immutable; the existing ticket lifecycle trigger records
-- the corresponding status transition in ticket_status_history.
create table public.ticket_verification_reviews (
  id bigint generated always as identity primary key,
  assigned_ticket_id uuid not null
    references public.assigned_tickets(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  reviewer_alias text not null,
  action text not null,
  manual_checked boolean not null default false,
  feedback text,
  created_at timestamptz not null default now(),
  constraint ticket_verification_reviews_action_check
    check (action in ('Approved', 'Returned', 'Reopened')),
  constraint ticket_verification_reviews_approval_check
    check (action <> 'Approved' or manual_checked),
  constraint ticket_verification_reviews_feedback_check
    check (action = 'Approved' or nullif(trim(feedback), '') is not null)
);

create index ticket_verification_reviews_ticket_time_idx
  on public.ticket_verification_reviews (assigned_ticket_id, created_at desc);

alter table public.ticket_verification_reviews enable row level security;

create policy "verification reviews: read"
on public.ticket_verification_reviews for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1 from public.assigned_tickets ticket
    where ticket.id = assigned_ticket_id
      and ticket.student_id = (select auth.uid())
  )
);

revoke all on table public.ticket_verification_reviews from anon, authenticated;
grant select on table public.ticket_verification_reviews to authenticated;

-- Students can submit work for verification or resume a returned ticket, but
-- only an instructor review may close or reopen it.
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
  v_current_status text;
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

  select ticket.status into v_current_status
  from public.assigned_tickets ticket
  where ticket.id = p_ticket_id
    and ticket.student_id = v_user_id;

  if not found then
    raise exception 'ticket_not_found' using errcode = 'P0002';
  end if;

  if p_status = 'Closed' then
    raise exception 'instructor_signoff_required' using errcode = '42501';
  end if;

  if v_current_status = 'Closed' then
    raise exception 'instructor_reopen_required' using errcode = '42501';
  end if;

  update public.assigned_tickets
  set status = p_status
  where id = p_ticket_id
    and student_id = v_user_id;
end;
$$;

revoke all on function public.update_my_assigned_ticket_status(uuid, text)
  from public, anon, authenticated;
grant execute on function public.update_my_assigned_ticket_status(uuid, text)
  to authenticated;

create or replace function public.review_assigned_ticket(
  p_assigned_ticket_id uuid,
  p_action text,
  p_manual_checked boolean default false,
  p_feedback text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reviewer_id uuid := (select auth.uid());
  v_reviewer_alias text;
  v_current_status text;
  v_next_status text;
begin
  if v_reviewer_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;

  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;

  if p_action not in ('Approved', 'Returned', 'Reopened') then
    raise exception 'invalid_review_action' using errcode = '22023';
  end if;

  if p_action = 'Approved' and not coalesce(p_manual_checked, false) then
    raise exception 'manual_check_required' using errcode = '22023';
  end if;

  if p_action in ('Returned', 'Reopened') and nullif(trim(p_feedback), '') is null then
    raise exception 'actionable_feedback_required' using errcode = '22023';
  end if;

  select ticket.status into v_current_status
  from public.assigned_tickets ticket
  where ticket.id = p_assigned_ticket_id
  for update;

  if not found then
    raise exception 'ticket_not_found' using errcode = 'P0002';
  end if;

  v_next_status := case p_action
    when 'Approved' then 'Closed'
    when 'Returned' then 'In Progress'
    when 'Reopened' then 'Triage'
  end;

  if (p_action in ('Approved', 'Returned') and v_current_status <> 'Verification')
     or (p_action = 'Reopened' and v_current_status <> 'Closed') then
    raise exception 'invalid_review_state:%:%', v_current_status, p_action
      using errcode = '22023';
  end if;

  select profile.alias into v_reviewer_alias
  from public.profiles profile
  where profile.id = v_reviewer_id;

  if v_reviewer_alias is null then
    raise exception 'reviewer_profile_not_found' using errcode = 'P0002';
  end if;

  update public.assigned_tickets
  set status = v_next_status
  where id = p_assigned_ticket_id;

  insert into public.ticket_verification_reviews (
    assigned_ticket_id, reviewer_id, reviewer_alias,
    action, manual_checked, feedback
  ) values (
    p_assigned_ticket_id, v_reviewer_id, v_reviewer_alias,
    p_action, coalesce(p_manual_checked, false), nullif(trim(p_feedback), '')
  );
end;
$$;

revoke all on function public.review_assigned_ticket(uuid, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.review_assigned_ticket(uuid, text, boolean, text)
  to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ticket_verification_reviews'
  ) then
    alter publication supabase_realtime add table public.ticket_verification_reviews;
  end if;
end;
$$;
