create table public.team_incidents (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.lab_assignments(id) on delete cascade,
  team_key text not null,
  team_name text not null,
  color_name text not null,
  color_hex text not null,
  title text not null,
  description text not null,
  shared_outcome text,
  shared_outcome_updated_by uuid references public.profiles(id) on delete set null,
  shared_outcome_updated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint team_incidents_assignment_key unique (assignment_id, team_key),
  constraint team_incidents_color_hex_check check (color_hex ~ '^#[0-9A-Fa-f]{6}$')
);

alter table public.assigned_tickets
  add column team_incident_id uuid references public.team_incidents(id) on delete restrict;

create table public.team_contributions (
  assigned_ticket_id uuid primary key references public.assigned_tickets(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  team_role text not null,
  contribution text,
  updated_at timestamptz not null default now(),
  constraint team_contributions_role_check check (team_role in (
    'Client communication / lead','Hands-on technician','Evidence / documentation',
    'Safety / equipment manager','Verification technician'
  )),
  constraint team_contributions_text_check check (contribution is null or char_length(btrim(contribution)) between 10 and 1000),
  constraint team_contributions_ticket_student_key unique (assigned_ticket_id, student_id)
);

create index team_incidents_assignment_idx on public.team_incidents (assignment_id);
create index assigned_tickets_team_incident_idx on public.assigned_tickets (team_incident_id);
create index team_contributions_student_idx on public.team_contributions (student_id);

alter table public.team_incidents enable row level security;
alter table public.team_contributions enable row level security;
revoke all on table public.team_incidents, public.team_contributions from anon, authenticated;
grant select on table public.team_incidents, public.team_contributions to authenticated;

create policy "team incidents: member or admin read" on public.team_incidents
for select to authenticated using (
  (select private.is_admin()) or id in (
    select ticket.team_incident_id from public.assigned_tickets ticket
    where ticket.student_id = (select auth.uid())
  )
);
create policy "team contributions: own or admin read" on public.team_contributions
for select to authenticated using (student_id = (select auth.uid()) or (select private.is_admin()));

create or replace function public.save_my_team_contribution(
  p_assigned_ticket_id uuid, p_team_role text, p_contribution text
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode='28000'; end if;
  if not exists (select 1 from public.assigned_tickets where id=p_assigned_ticket_id and student_id=v_user_id and team_incident_id is not null)
    then raise exception 'team_ticket_not_found' using errcode='P0002'; end if;
  if p_team_role not in ('Client communication / lead','Hands-on technician','Evidence / documentation','Safety / equipment manager','Verification technician')
    then raise exception 'invalid_team_role' using errcode='22023'; end if;
  if char_length(btrim(coalesce(p_contribution,''))) not between 10 and 1000
    then raise exception 'contribution_required' using errcode='22023'; end if;
  insert into public.team_contributions(assigned_ticket_id,student_id,team_role,contribution,updated_at)
  values(p_assigned_ticket_id,v_user_id,p_team_role,btrim(p_contribution),now())
  on conflict(assigned_ticket_id) do update set team_role=excluded.team_role,contribution=excluded.contribution,updated_at=now()
  where public.team_contributions.student_id=v_user_id;
end; $$;
revoke all on function public.save_my_team_contribution(uuid,text,text) from public,anon,authenticated;
grant execute on function public.save_my_team_contribution(uuid,text,text) to authenticated;

create or replace function public.save_my_team_shared_outcome(
  p_assigned_ticket_id uuid,p_shared_outcome text,p_expected_updated_at timestamptz default null
)
returns void language plpgsql security definer set search_path = '' as $$
declare v_user_id uuid:=auth.uid(); v_incident_id uuid; v_current_updated_at timestamptz;
begin
  if v_user_id is null then raise exception 'authentication_required' using errcode='28000'; end if;
  select team_incident_id into v_incident_id from public.assigned_tickets
  where id=p_assigned_ticket_id and student_id=v_user_id and team_incident_id is not null;
  if v_incident_id is null then raise exception 'team_ticket_not_found' using errcode='P0002'; end if;
  if char_length(btrim(coalesce(p_shared_outcome,''))) not between 10 and 2000
    then raise exception 'shared_outcome_required' using errcode='22023'; end if;
  select shared_outcome_updated_at into v_current_updated_at from public.team_incidents
  where id=v_incident_id for update;
  if p_expected_updated_at is distinct from v_current_updated_at and v_current_updated_at is not null
    then raise exception 'shared_outcome_changed' using errcode='40001'; end if;
  update public.team_incidents set shared_outcome=btrim(p_shared_outcome),
    shared_outcome_updated_by=v_user_id,shared_outcome_updated_at=now() where id=v_incident_id;
end; $$;
revoke all on function public.save_my_team_shared_outcome(uuid,text,timestamptz) from public,anon,authenticated;
grant execute on function public.save_my_team_shared_outcome(uuid,text,timestamptz) to authenticated;

create or replace function public.team_roster(p_assigned_ticket_id uuid)
returns table(student_alias text, team_role text, contribution_recorded boolean, ticket_status text)
language plpgsql security definer set search_path = '' as $$
declare v_incident uuid;
begin
  select team_incident_id into v_incident from public.assigned_tickets
  where id=p_assigned_ticket_id and (student_id=auth.uid() or (select private.is_admin()));
  if v_incident is null then raise exception 'team_ticket_not_found' using errcode='P0002'; end if;
  return query select profile.alias, contribution.team_role, contribution.contribution is not null, ticket.status
  from public.assigned_tickets ticket join public.profiles profile on profile.id=ticket.student_id
  left join public.team_contributions contribution on contribution.assigned_ticket_id=ticket.id
  where ticket.team_incident_id=v_incident order by ticket.created_at,profile.alias;
end; $$;
revoke all on function public.team_roster(uuid) from public,anon,authenticated;
grant execute on function public.team_roster(uuid) to authenticated;

create or replace function public.create_lab_assignment_with_tickets(p_class_id uuid,p_week_label text,p_tickets jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_assignment_id uuid; v_ticket jsonb; v_ticket_id uuid; v_limit integer; v_responses jsonb; v_incident_id uuid;
begin
  if not (select private.is_admin()) then raise exception 'admin_required' using errcode='42501'; end if;
  if jsonb_typeof(p_tickets)<>'array' or jsonb_array_length(p_tickets)=0 then raise exception 'tickets_required'; end if;
  insert into public.lab_assignments(class_id,week_label,assigned_by) values(p_class_id,btrim(p_week_label),auth.uid()) returning id into v_assignment_id;
  for v_ticket in select value from jsonb_array_elements(p_tickets) item(value) loop
    v_limit:=coalesce((v_ticket->>'inquiry_limit')::integer,0); v_responses:=coalesce(v_ticket->'client_responses','{}'::jsonb); v_incident_id:=null;
    if v_limit not between 0 and 3 then raise exception 'invalid_inquiry_limit'; end if;
    if not private.valid_client_responses(v_limit,v_responses) then raise exception 'incomplete_client_responses'; end if;
    if nullif(v_ticket->>'team_key','') is not null then
      insert into public.team_incidents(assignment_id,team_key,team_name,color_name,color_hex,title,description)
      values(v_assignment_id,v_ticket->>'team_key',v_ticket->>'team_name',v_ticket->>'color_name',v_ticket->>'color_hex',v_ticket->>'title',v_ticket->>'description')
      on conflict(assignment_id,team_key) do update set
        team_name=excluded.team_name,color_name=excluded.color_name,color_hex=excluded.color_hex,
        title=excluded.title,description=excluded.description
      returning id into v_incident_id;
    end if;
    insert into public.assigned_tickets(assignment_id,student_id,group_tag,scenario_id,course_id,week,title,description,priority,status,inquiry_limit,team_incident_id)
    values(v_assignment_id,(v_ticket->>'student_id')::uuid,nullif(v_ticket->>'group_tag',''),v_ticket->>'scenario_id',v_ticket->>'course_id',(v_ticket->>'week')::integer,v_ticket->>'title',v_ticket->>'description',v_ticket->>'priority','New',v_limit,v_incident_id)
    returning id into v_ticket_id;
    if v_limit>0 then insert into private.assigned_ticket_scripts values(v_ticket_id,v_responses); end if;
    if v_incident_id is not null and nullif(v_ticket->>'team_role','') is not null then
      insert into public.team_contributions(assigned_ticket_id,student_id,team_role,contribution)
      values(v_ticket_id,(v_ticket->>'student_id')::uuid,v_ticket->>'team_role',null);
    end if;
  end loop; return v_assignment_id;
end; $$;
revoke all on function public.create_lab_assignment_with_tickets(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_lab_assignment_with_tickets(uuid,text,jsonb) to authenticated;

create or replace function public.review_assigned_ticket(p_assigned_ticket_id uuid,p_action text,p_manual_checked boolean default false,p_feedback text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare v_reviewer_id uuid:=auth.uid(); v_reviewer_alias text; v_current_status text; v_next_status text; v_incident uuid;
begin
  if v_reviewer_id is null then raise exception 'authentication_required' using errcode='28000'; end if;
  if not (select private.is_admin()) then raise exception 'admin_required' using errcode='42501'; end if;
  if p_action not in ('Approved','Returned','Reopened') then raise exception 'invalid_review_action' using errcode='22023'; end if;
  if p_action='Approved' and not coalesce(p_manual_checked,false) then raise exception 'manual_check_required' using errcode='22023'; end if;
  if p_action in ('Returned','Reopened') and nullif(btrim(p_feedback),'') is null then raise exception 'actionable_feedback_required' using errcode='22023'; end if;
  select status,team_incident_id into v_current_status,v_incident from public.assigned_tickets where id=p_assigned_ticket_id for update;
  if not found then raise exception 'ticket_not_found' using errcode='P0002'; end if;
  if (p_action in ('Approved','Returned') and v_current_status<>'Verification') or (p_action='Reopened' and v_current_status<>'Closed') then raise exception 'invalid_review_state:%:%',v_current_status,p_action using errcode='22023'; end if;
  if p_action='Approved' and v_incident is not null and exists(
    select 1 from public.assigned_tickets sibling left join public.team_contributions contribution on contribution.assigned_ticket_id=sibling.id
    where sibling.team_incident_id=v_incident and (contribution.contribution is null or sibling.status not in ('Verification','Closed'))
  ) then raise exception 'team_contributions_incomplete' using errcode='22023'; end if;
  v_next_status:=case p_action when 'Approved' then 'Closed' when 'Returned' then 'In Progress' when 'Reopened' then 'Triage' end;
  select alias into v_reviewer_alias from public.profiles where id=v_reviewer_id;
  update public.assigned_tickets set status=v_next_status where id=p_assigned_ticket_id;
  insert into public.ticket_verification_reviews(assigned_ticket_id,reviewer_id,reviewer_alias,action,manual_checked,feedback)
  values(p_assigned_ticket_id,v_reviewer_id,v_reviewer_alias,p_action,coalesce(p_manual_checked,false),nullif(btrim(p_feedback),''));
end; $$;
revoke all on function public.review_assigned_ticket(uuid,text,boolean,text) from public,anon,authenticated;
grant execute on function public.review_assigned_ticket(uuid,text,boolean,text) to authenticated;
