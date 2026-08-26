alter table public.assigned_tickets
  add column if not exists inquiry_limit integer not null default 0,
  add column if not exists client_responses jsonb not null default '{}'::jsonb;

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
  response_quality text not null default 'exact',
  inquiry_number integer not null,
  created_at timestamptz not null default now(),
  constraint ticket_client_inquiries_question_check
    check (char_length(btrim(question)) between 1 and 500),
  constraint ticket_client_inquiries_purpose_check
    check (purpose in ('scope', 'timing_change', 'symptom_error', 'environment_equipment', 'prior_troubleshooting', 'impact_urgency')),
  constraint ticket_client_inquiries_quality_check
    check (response_quality in ('exact', 'ambiguous', 'mistaken', 'no_useful_information')),
  constraint ticket_client_inquiries_number_check check (inquiry_number between 1 and 3),
  constraint ticket_client_inquiries_request_key unique (assigned_ticket_id, student_id, request_id),
  constraint ticket_client_inquiries_sequence_key unique (assigned_ticket_id, inquiry_number)
);

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

  v_response := v_ticket.client_responses -> p_purpose;
  if v_response is null
     or jsonb_typeof(v_response) <> 'object'
     or nullif(btrim(v_response ->> 'response'), '') is null then
    raise exception 'client_response_not_configured';
  end if;

  insert into public.ticket_client_inquiries (
    request_id, assigned_ticket_id, student_id, question, purpose,
    response, response_quality, inquiry_number
  ) values (
    p_request_id, p_assigned_ticket_id, v_user_id, btrim(p_question), p_purpose,
    btrim(v_response ->> 'response'), coalesce(v_response ->> 'quality', 'exact'), v_count + 1
  ) returning * into v_inserted;
  return v_inserted;
end;
$$;

revoke all on function public.submit_my_client_inquiry(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.submit_my_client_inquiry(uuid, uuid, text, text) to authenticated;
