-- Issue #13: link Cinder tickets to pre-numbered printed Service Log pages
-- without copying the manual's detailed tool/action/observation narrative.
create table if not exists public.field_journal_links (
  assigned_ticket_id uuid primary key
    references public.assigned_tickets(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  manual_type text not null,
  service_log_number integer not null,
  station_id text,
  asset_ids text[] not null default '{}',
  team_role text,
  impact text,
  urgency text,
  chosen_priority text,
  clarifying_question text,
  client_response text,
  escalation_reason text,
  verification_checklist jsonb not null default '{}',
  client_resolution text,
  updated_at timestamptz not null default now(),
  constraint field_journal_links_manual_type_check
    check (manual_type in ('Hardware', 'Network', 'Security')),
  constraint field_journal_links_service_log_check
    check (service_log_number between 1 and 99),
  constraint field_journal_links_impact_check
    check (impact is null or impact in ('Single user', 'Small group', 'Classroom', 'Service wide')),
  constraint field_journal_links_urgency_check
    check (urgency is null or urgency in ('Low', 'Normal', 'High', 'Immediate')),
  constraint field_journal_links_priority_check
    check (chosen_priority is null or chosen_priority in ('Low', 'Medium', 'High', 'Critical')),
  constraint field_journal_links_verification_check
    check (jsonb_typeof(verification_checklist) = 'object')
);

create index if not exists field_journal_links_student_id_idx
  on public.field_journal_links (student_id);

alter table public.field_journal_links enable row level security;

create policy "field journal links: read"
on public.field_journal_links for select
to authenticated
using (
  student_id = (select auth.uid())
  or (select private.is_admin())
);

revoke all on table public.field_journal_links from anon, authenticated;
grant select on table public.field_journal_links to authenticated;

create or replace function public.save_my_field_journal_link(
  p_assigned_ticket_id uuid,
  p_manual_type text,
  p_service_log_number integer,
  p_station_id text,
  p_asset_ids text[],
  p_team_role text,
  p_impact text,
  p_urgency text,
  p_chosen_priority text,
  p_clarifying_question text,
  p_client_response text,
  p_escalation_reason text,
  p_verification_checklist jsonb,
  p_client_resolution text
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

  if not exists (
    select 1 from public.assigned_tickets ticket
    where ticket.id = p_assigned_ticket_id
      and ticket.student_id = v_user_id
  ) then
    raise exception 'ticket_not_found' using errcode = 'P0002';
  end if;

  if p_manual_type not in ('Hardware', 'Network', 'Security')
     or p_service_log_number not between 1 and 99 then
    raise exception 'invalid_manual_reference' using errcode = '22023';
  end if;

  if p_impact is not null and p_impact not in ('Single user', 'Small group', 'Classroom', 'Service wide') then
    raise exception 'invalid_impact' using errcode = '22023';
  end if;

  if p_urgency is not null and p_urgency not in ('Low', 'Normal', 'High', 'Immediate') then
    raise exception 'invalid_urgency' using errcode = '22023';
  end if;

  if p_chosen_priority is not null and p_chosen_priority not in ('Low', 'Medium', 'High', 'Critical') then
    raise exception 'invalid_priority' using errcode = '22023';
  end if;

  if coalesce(jsonb_typeof(p_verification_checklist), 'object') <> 'object' then
    raise exception 'invalid_verification_checklist' using errcode = '22023';
  end if;

  insert into public.field_journal_links (
    assigned_ticket_id, student_id, manual_type, service_log_number,
    station_id, asset_ids, team_role, impact, urgency, chosen_priority,
    clarifying_question, client_response, escalation_reason,
    verification_checklist, client_resolution, updated_at
  ) values (
    p_assigned_ticket_id, v_user_id, p_manual_type, p_service_log_number,
    nullif(trim(p_station_id), ''), coalesce(p_asset_ids, '{}'), nullif(trim(p_team_role), ''),
    p_impact, p_urgency, p_chosen_priority,
    nullif(trim(p_clarifying_question), ''), nullif(trim(p_client_response), ''),
    nullif(trim(p_escalation_reason), ''), coalesce(p_verification_checklist, '{}'),
    nullif(trim(p_client_resolution), ''), now()
  )
  on conflict (assigned_ticket_id) do update
  set manual_type = excluded.manual_type,
      service_log_number = excluded.service_log_number,
      station_id = excluded.station_id,
      asset_ids = excluded.asset_ids,
      team_role = excluded.team_role,
      impact = excluded.impact,
      urgency = excluded.urgency,
      chosen_priority = excluded.chosen_priority,
      clarifying_question = excluded.clarifying_question,
      client_response = excluded.client_response,
      escalation_reason = excluded.escalation_reason,
      verification_checklist = excluded.verification_checklist,
      client_resolution = excluded.client_resolution,
      updated_at = excluded.updated_at
  where public.field_journal_links.student_id = v_user_id;
end;
$$;

revoke all on function public.save_my_field_journal_link(
  uuid, text, integer, text, text[], text, text, text, text,
  text, text, text, jsonb, text
) from public, anon, authenticated;
grant execute on function public.save_my_field_journal_link(
  uuid, text, integer, text, text[], text, text, text, text,
  text, text, text, jsonb, text
) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'field_journal_links'
  ) then
    alter publication supabase_realtime add table public.field_journal_links;
  end if;
end;
$$;
