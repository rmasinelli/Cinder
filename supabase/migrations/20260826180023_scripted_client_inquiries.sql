alter table public.assigned_tickets
  add column if not exists inquiry_limit integer not null default 0;

alter table public.assigned_tickets
  drop constraint if exists assigned_tickets_inquiry_limit_check;
alter table public.assigned_tickets
  add constraint assigned_tickets_inquiry_limit_check
  check (inquiry_limit between 0 and 3);

create table if not exists public.ticket_client_inquiries (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  assigned_ticket_id uuid not null references public.assigned_tickets(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  question text not null,
  purpose text not null,
  response text not null,
  inquiry_number integer not null,
  created_at timestamptz not null default now(),
  constraint ticket_client_inquiries_question_check
    check (char_length(btrim(question)) between 1 and 500),
  constraint ticket_client_inquiries_purpose_check
    check (purpose in ('scope', 'timing_change', 'symptom_error', 'environment_equipment', 'prior_troubleshooting', 'impact_urgency')),
  constraint ticket_client_inquiries_number_check check (inquiry_number between 1 and 3),
  constraint ticket_client_inquiries_request_key unique (assigned_ticket_id, student_id, request_id),
  constraint ticket_client_inquiries_sequence_key unique (assigned_ticket_id, inquiry_number)
);

create table if not exists private.assigned_ticket_scripts (
  assigned_ticket_id uuid primary key references public.assigned_tickets(id) on delete cascade,
  client_responses jsonb not null
);
alter table private.assigned_ticket_scripts enable row level security;
revoke all on table private.assigned_ticket_scripts from public, anon, authenticated;

alter table public.ticket_client_inquiries enable row level security;
revoke all on table public.ticket_client_inquiries from anon, authenticated;
grant select on table public.ticket_client_inquiries to authenticated;

drop policy if exists "ticket_client_inquiries: student read own" on public.ticket_client_inquiries;
create policy "ticket_client_inquiries: student read own"
on public.ticket_client_inquiries for select
to authenticated
using (
  student_id = (select auth.uid())
  and exists (
    select 1 from public.assigned_tickets ticket
    where ticket.id = assigned_ticket_id
      and ticket.student_id = (select auth.uid())
  )
);

drop policy if exists "ticket_client_inquiries: admin read" on public.ticket_client_inquiries;
create policy "ticket_client_inquiries: admin read"
on public.ticket_client_inquiries for select
to authenticated
using ((select private.is_admin()));

create index if not exists ticket_client_inquiries_ticket_created_idx
  on public.ticket_client_inquiries (assigned_ticket_id, created_at);
create index if not exists ticket_client_inquiries_student_idx
  on public.ticket_client_inquiries (student_id);

create or replace function private.valid_client_responses(p_limit integer, p_responses jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_limit = 0 or (
    jsonb_typeof(p_responses) = 'object'
    and not exists (
      select 1
      from unnest(array['scope','timing_change','symptom_error','environment_equipment','prior_troubleshooting','impact_urgency']) purpose
      where jsonb_typeof(p_responses -> purpose) <> 'object'
         or nullif(btrim(p_responses -> purpose ->> 'response'), '') is null
         or coalesce(p_responses -> purpose ->> 'quality', '') not in ('exact','ambiguous','mistaken','no_useful_information')
    )
  );
$$;
revoke all on function private.valid_client_responses(integer, jsonb) from public, anon, authenticated;

create or replace function public.create_lab_assignment_with_tickets(
  p_class_id uuid,
  p_week_label text,
  p_tickets jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment_id uuid;
  v_ticket jsonb;
  v_ticket_id uuid;
  v_limit integer;
  v_responses jsonb;
begin
  if not (select private.is_admin()) then raise exception 'admin_required' using errcode = '42501'; end if;
  if jsonb_typeof(p_tickets) <> 'array' or jsonb_array_length(p_tickets) = 0 then raise exception 'tickets_required'; end if;

  insert into public.lab_assignments (class_id, week_label, assigned_by)
  values (p_class_id, btrim(p_week_label), auth.uid())
  returning id into v_assignment_id;

  for v_ticket in select value from jsonb_array_elements(p_tickets) item(value) loop
    v_limit := coalesce((v_ticket ->> 'inquiry_limit')::integer, 0);
    v_responses := coalesce(v_ticket -> 'client_responses', '{}'::jsonb);
    if v_limit not between 0 and 3 then raise exception 'invalid_inquiry_limit'; end if;
    if not private.valid_client_responses(v_limit, v_responses) then raise exception 'incomplete_client_responses'; end if;

    insert into public.assigned_tickets (
      assignment_id, student_id, group_tag, scenario_id, course_id, week,
      title, description, priority, status, inquiry_limit
    ) values (
      v_assignment_id, (v_ticket ->> 'student_id')::uuid, nullif(v_ticket ->> 'group_tag',''),
      v_ticket ->> 'scenario_id', v_ticket ->> 'course_id', (v_ticket ->> 'week')::integer,
      v_ticket ->> 'title', v_ticket ->> 'description', v_ticket ->> 'priority', 'New', v_limit
    ) returning id into v_ticket_id;

    if v_limit > 0 then
      insert into private.assigned_ticket_scripts (assigned_ticket_id, client_responses)
      values (v_ticket_id, v_responses);
    end if;
  end loop;
  return v_assignment_id;
end;
$$;
revoke all on function public.create_lab_assignment_with_tickets(uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_lab_assignment_with_tickets(uuid, text, jsonb) to authenticated;

create or replace function public.submit_my_client_inquiry(
  p_assigned_ticket_id uuid,
  p_request_id uuid,
  p_question text,
  p_purpose text
)
returns public.ticket_client_inquiries
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_ticket public.assigned_tickets%rowtype;
  v_existing public.ticket_client_inquiries%rowtype;
  v_response jsonb;
  v_count integer;
  v_inserted public.ticket_client_inquiries%rowtype;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_request_id is null then raise exception 'request_id_required'; end if;
  if char_length(btrim(coalesce(p_question, ''))) not between 1 and 500 then
    raise exception 'question_required';
  end if;
  if p_purpose not in ('scope', 'timing_change', 'symptom_error', 'environment_equipment', 'prior_troubleshooting', 'impact_urgency') then
    raise exception 'invalid_inquiry_purpose';
  end if;

  select * into v_ticket
  from public.assigned_tickets
  where id = p_assigned_ticket_id and student_id = v_user_id
  for update;
  if not found then raise exception 'ticket_not_found'; end if;

  select * into v_existing
  from public.ticket_client_inquiries
  where assigned_ticket_id = p_assigned_ticket_id
    and student_id = v_user_id
    and request_id = p_request_id;
  if found then return v_existing; end if;

  select count(*)::integer into v_count
  from public.ticket_client_inquiries
  where assigned_ticket_id = p_assigned_ticket_id;
  if v_count >= v_ticket.inquiry_limit then raise exception 'inquiry_limit_reached'; end if;

  select script.client_responses -> p_purpose into v_response
  from private.assigned_ticket_scripts script
  where script.assigned_ticket_id = p_assigned_ticket_id;
  if v_response is null
     or jsonb_typeof(v_response) <> 'object'
     or nullif(btrim(v_response ->> 'response'), '') is null then
    raise exception 'client_response_not_configured';
  end if;

  insert into public.ticket_client_inquiries (
    request_id, assigned_ticket_id, student_id, question, purpose,
    response, inquiry_number
  ) values (
    p_request_id, p_assigned_ticket_id, v_user_id, btrim(p_question), p_purpose,
    btrim(v_response ->> 'response'), v_count + 1
  ) returning * into v_inserted;
  return v_inserted;
end;
$$;

revoke all on function public.submit_my_client_inquiry(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.submit_my_client_inquiry(uuid, uuid, text, text) to authenticated;
