alter table public.team_contributions
  add column excused_at timestamptz,
  add column excused_by uuid references public.profiles(id) on delete set null,
  add column excused_reason text,
  add constraint team_contributions_excused_reason_check
    check (excused_reason is null or char_length(btrim(excused_reason)) between 10 and 500),
  add constraint team_contributions_excused_state_check
    check ((excused_at is null and excused_by is null and excused_reason is null)
      or (excused_at is not null and excused_by is not null and excused_reason is not null));

create or replace function public.set_team_member_excused(
  p_assigned_ticket_id uuid,p_excused boolean,p_reason text default null
)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not (select private.is_admin()) then raise exception 'admin_required' using errcode='42501'; end if;
  if not exists(select 1 from public.assigned_tickets where id=p_assigned_ticket_id and team_incident_id is not null)
    then raise exception 'team_ticket_not_found' using errcode='P0002'; end if;
  if p_excused and char_length(btrim(coalesce(p_reason,''))) not between 10 and 500
    then raise exception 'excused_reason_required' using errcode='22023'; end if;
  update public.team_contributions set
    excused_at=case when p_excused then now() else null end,
    excused_by=case when p_excused then auth.uid() else null end,
    excused_reason=case when p_excused then btrim(p_reason) else null end,
    updated_at=now()
  where assigned_ticket_id=p_assigned_ticket_id;
  if not found then raise exception 'team_contribution_not_found' using errcode='P0002'; end if;
end; $$;
revoke all on function public.set_team_member_excused(uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.set_team_member_excused(uuid,boolean,text) to authenticated;

create or replace function public.load_builtin_scenario_secrets(p_items jsonb,p_replace boolean default false)
returns integer language plpgsql security definer set search_path='' as $$
declare item jsonb; v_responses jsonb; v_count integer:=0;
begin
  if not (select private.is_admin()) then raise exception 'admin_required' using errcode='42501'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)=0 then raise exception 'secret_pack_required'; end if;
  for item in select value from jsonb_array_elements(p_items) entry(value) loop
    v_responses:=coalesce(item->'client_responses','{}'::jsonb);
    if nullif(btrim(item->>'scenario_id'),'') is null or nullif(btrim(item->>'instructor_notes'),'') is null
      then raise exception 'incomplete_secret_item'; end if;
    if v_responses<>'{}'::jsonb and not private.valid_client_responses(1,v_responses)
      then raise exception 'incomplete_client_responses'; end if;
  end loop;
  if p_replace then delete from private.builtin_scenario_secrets; end if;
  for item in select value from jsonb_array_elements(p_items) entry(value) loop
    insert into private.builtin_scenario_secrets(scenario_id,instructor_notes,client_responses)
    values(btrim(item->>'scenario_id'),btrim(item->>'instructor_notes'),coalesce(item->'client_responses','{}'::jsonb))
    on conflict(scenario_id) do update set instructor_notes=excluded.instructor_notes,client_responses=excluded.client_responses;
    v_count:=v_count+1;
  end loop;
  return v_count;
end; $$;
revoke all on function public.load_builtin_scenario_secrets(jsonb,boolean) from public,anon,authenticated;
grant execute on function public.load_builtin_scenario_secrets(jsonb,boolean) to authenticated;

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
  if p_action='Approved' and exists(
    select 1 from public.team_contributions
    where assigned_ticket_id=p_assigned_ticket_id and excused_at is not null
  ) then raise exception 'excused_ticket_cannot_be_approved' using errcode='22023'; end if;
  if p_action='Approved' and v_incident is not null and exists(
    select 1 from public.assigned_tickets sibling
    left join public.team_contributions contribution on contribution.assigned_ticket_id=sibling.id
    where sibling.team_incident_id=v_incident and contribution.excused_at is null
      and (contribution.contribution is null or sibling.status not in ('Verification','Closed'))
  ) then raise exception 'team_contributions_incomplete' using errcode='22023'; end if;
  v_next_status:=case p_action when 'Approved' then 'Closed' when 'Returned' then 'In Progress' when 'Reopened' then 'Triage' end;
  select alias into v_reviewer_alias from public.profiles where id=v_reviewer_id;
  update public.assigned_tickets set status=v_next_status where id=p_assigned_ticket_id;
  insert into public.ticket_verification_reviews(assigned_ticket_id,reviewer_id,reviewer_alias,action,manual_checked,feedback)
  values(p_assigned_ticket_id,v_reviewer_id,v_reviewer_alias,p_action,coalesce(p_manual_checked,false),nullif(btrim(p_feedback),''));
end; $$;
revoke all on function public.review_assigned_ticket(uuid,text,boolean,text) from public,anon,authenticated;
grant execute on function public.review_assigned_ticket(uuid,text,boolean,text) to authenticated;
