-- Issue #40: per-assignment readiness checks and preparation-station recovery.
-- Answer keys are never granted through the Data API. Students interact only
-- through ownership-scoped RPCs that return sanitized questions and feedback.

create table public.readiness_checks (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null unique references public.lab_assignments(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  instructions text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published')),
  passing_percent integer not null default 80 check (passing_percent between 1 and 100),
  questions jsonb not null default '[]'::jsonb,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  constraint readiness_checks_five_questions check (
    jsonb_typeof(questions) = 'array' and jsonb_array_length(questions) = 5
  )
);

create table public.readiness_attempts (
  id uuid primary key default gen_random_uuid(),
  check_id uuid not null references public.readiness_checks(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  answers jsonb not null,
  score_percent integer not null check (score_percent between 0 and 100),
  passed boolean not null,
  feedback jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now(),
  unique (check_id, student_id, attempt_number)
);

create table public.safety_acknowledgments (
  student_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  acknowledged_at timestamptz not null default now(),
  primary key (student_id, class_id)
);

create index readiness_attempts_student_check_idx
  on public.readiness_attempts(student_id, check_id, attempt_number desc);
create index readiness_checks_class_idx on public.readiness_checks(class_id);

alter table public.readiness_checks enable row level security;
alter table public.readiness_attempts enable row level security;
alter table public.safety_acknowledgments enable row level security;

revoke all on table public.readiness_checks from anon, authenticated;
revoke all on table public.readiness_attempts from anon, authenticated;
revoke all on table public.safety_acknowledgments from anon, authenticated;
grant select, insert, update, delete on table public.readiness_checks to authenticated;
grant select on table public.readiness_attempts to authenticated;
grant select on table public.safety_acknowledgments to authenticated;

create policy "readiness checks: admin authoring"
on public.readiness_checks for all
to authenticated
using ((select private.is_admin()))
with check (
  (select private.is_admin())
  and created_by = (select auth.uid())
  and exists (
    select 1 from public.lab_assignments assignment
    where assignment.id = readiness_checks.assignment_id
      and assignment.class_id = readiness_checks.class_id
  )
);

create policy "readiness attempts: own or admin read"
on public.readiness_attempts for select
to authenticated
using (student_id = (select auth.uid()) or (select private.is_admin()));

create policy "safety acknowledgments: own or admin read"
on public.safety_acknowledgments for select
to authenticated
using (student_id = (select auth.uid()) or (select private.is_admin()));

create or replace function private.has_passed_readiness(p_assignment_id uuid, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.readiness_checks check_row
    where check_row.assignment_id = p_assignment_id
      and check_row.status = 'published'
  ) or exists (
    select 1
    from public.readiness_checks check_row
    join public.readiness_attempts attempt on attempt.check_id = check_row.id
    where check_row.assignment_id = p_assignment_id
      and check_row.status = 'published'
      and attempt.student_id = p_student_id
      and attempt.passed
  );
$$;

revoke all on function private.has_passed_readiness(uuid, uuid) from public, anon, authenticated;
grant execute on function private.has_passed_readiness(uuid, uuid) to authenticated;

-- Replace the student ticket-read policy so a published check gates only that
-- student's child ticket. Other prepared teammates remain unaffected.
drop policy if exists "assigned_tickets: student read" on public.assigned_tickets;
create policy "assigned_tickets: student read"
on public.assigned_tickets for select
to authenticated
using (
  student_id = (select auth.uid())
  and (select private.has_passed_readiness(assignment_id, (select auth.uid())))
);

create or replace function public.get_my_readiness_checks()
returns table (
  check_id uuid,
  assignment_id uuid,
  class_id uuid,
  title text,
  instructions text,
  questions jsonb,
  attempt_count integer,
  last_score integer,
  passed boolean,
  state text
)
language sql
stable
security definer
set search_path = ''
as $$
  with eligible as (
    select distinct check_row.*
    from public.readiness_checks check_row
    join public.lab_assignments assignment on assignment.id = check_row.assignment_id
    join public.assigned_tickets ticket
      on ticket.assignment_id = assignment.id
     and ticket.student_id = (select auth.uid())
    where check_row.status = 'published'
  ), attempt_summary as (
    select attempt.check_id,
      count(*)::integer as attempt_count,
      (array_agg(attempt.score_percent order by attempt.attempt_number desc))[1] as last_score,
      bool_or(attempt.passed) as passed
    from public.readiness_attempts attempt
    where attempt.student_id = (select auth.uid())
    group by attempt.check_id
  )
  select eligible.id,
    eligible.assignment_id,
    eligible.class_id,
    eligible.title,
    eligible.instructions,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', question.value->>'id',
        'prompt', question.value->>'prompt',
        'options', question.value->'options'
      ) order by question.ordinality)
      from jsonb_array_elements(eligible.questions) with ordinality as question(value, ordinality)
    ), '[]'::jsonb),
    coalesce(attempt_summary.attempt_count, 0),
    attempt_summary.last_score,
    coalesce(attempt_summary.passed, false),
    case
      when coalesce(attempt_summary.passed, false) then 'ready'
      when coalesce(attempt_summary.attempt_count, 0) > 0 then 'preparing'
      else 'not_started'
    end
  from eligible
  left join attempt_summary on attempt_summary.check_id = eligible.id
  order by eligible.created_at;
$$;

revoke all on function public.get_my_readiness_checks() from public, anon, authenticated;
grant execute on function public.get_my_readiness_checks() to authenticated;

create or replace function public.submit_my_readiness_check(p_check_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_check public.readiness_checks%rowtype;
  v_attempt integer;
  v_correct integer;
  v_score integer;
  v_passed boolean;
  v_feedback jsonb;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if jsonb_typeof(p_answers) <> 'object' then
    raise exception 'invalid_answers' using errcode = '22023';
  end if;

  select check_row.* into v_check
  from public.readiness_checks check_row
  join public.lab_assignments assignment on assignment.id = check_row.assignment_id
  join public.assigned_tickets ticket
    on ticket.assignment_id = assignment.id
   and ticket.student_id = v_user_id
  where check_row.id = p_check_id and check_row.status = 'published';

  if not found then
    raise exception 'readiness_check_not_found' using errcode = 'P0002';
  end if;

  -- Two tabs or a double-click would otherwise read the same attempt_number
  -- and collide on the (check_id, student_id, attempt_number) unique index.
  perform pg_advisory_xact_lock(
    hashtextextended(p_check_id::text || v_user_id::text, 0)
  );

  if exists (
    select 1 from public.readiness_attempts
    where check_id = p_check_id and student_id = v_user_id and passed
  ) then
    raise exception 'readiness_already_passed' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_check.questions) question
    where not (p_answers ? (question->>'id'))
  ) then
    raise exception 'all_answers_required' using errcode = '22023';
  end if;

  select count(*)::integer into v_correct
  from jsonb_array_elements(v_check.questions) question
  where p_answers->>(question->>'id') = question->>'correct';
  v_score := v_correct * 20;
  v_passed := v_score >= v_check.passing_percent;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', question->>'id',
    'correct', p_answers->>(question->>'id') = question->>'correct',
    'explanation', question->>'explanation'
  )), '[]'::jsonb)
  into v_feedback
  from jsonb_array_elements(v_check.questions) question;

  select coalesce(max(attempt_number), 0) + 1 into v_attempt
  from public.readiness_attempts
  where check_id = p_check_id and student_id = v_user_id;

  insert into public.readiness_attempts (
    check_id, student_id, attempt_number, answers, score_percent, passed, feedback
  ) values (
    p_check_id, v_user_id, v_attempt, p_answers, v_score, v_passed, v_feedback
  );

  return jsonb_build_object(
    'attempt', v_attempt,
    'score_percent', v_score,
    'passed', v_passed,
    'state', case when v_passed then 'ready' else 'preparing' end,
    'feedback', v_feedback
  );
end;
$$;

revoke all on function public.submit_my_readiness_check(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.submit_my_readiness_check(uuid, jsonb) to authenticated;

create or replace function public.acknowledge_my_class_safety(p_class_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_acknowledged_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.profile_classes membership
    where membership.profile_id = v_user_id and membership.class_id = p_class_id
  ) then
    raise exception 'class_not_found' using errcode = 'P0002';
  end if;

  insert into public.safety_acknowledgments(student_id, class_id)
  values (v_user_id, p_class_id)
  on conflict (student_id, class_id) do nothing;

  select acknowledged_at into v_acknowledged_at
  from public.safety_acknowledgments
  where student_id = v_user_id and class_id = p_class_id;
  return v_acknowledged_at;
end;
$$;

revoke all on function public.acknowledge_my_class_safety(uuid) from public, anon, authenticated;
grant execute on function public.acknowledge_my_class_safety(uuid) to authenticated;

create or replace function public.readiness_roster(p_check_id uuid)
returns table (
  student_id uuid,
  alias text,
  ticket_status text,
  attempt_count integer,
  last_score integer,
  readiness_state text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode = '42501';
  end if;
  return query
  select ticket.student_id,
    profile.alias,
    ticket.status,
    count(attempt.id)::integer,
    (array_agg(attempt.score_percent order by attempt.attempt_number desc)
      filter (where attempt.id is not null))[1],
    case
      when ticket.status = 'Closed' then 'complete'
      when bool_or(coalesce(attempt.passed, false)) then 'ready'
      when count(attempt.id) > 0 then 'preparing'
      else 'absent'
    end
  from public.readiness_checks check_row
  join public.assigned_tickets ticket on ticket.assignment_id = check_row.assignment_id
  join public.profiles profile on profile.id = ticket.student_id
  left join public.readiness_attempts attempt
    on attempt.check_id = check_row.id and attempt.student_id = ticket.student_id
  where check_row.id = p_check_id
  group by ticket.student_id, profile.alias, ticket.status
  order by profile.alias;
end;
$$;

revoke all on function public.readiness_roster(uuid) from public, anon, authenticated;
grant execute on function public.readiness_roster(uuid) to authenticated;
