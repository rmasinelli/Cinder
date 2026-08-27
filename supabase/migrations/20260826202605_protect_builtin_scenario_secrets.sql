create table private.builtin_scenario_secrets (
  scenario_id text primary key,
  instructor_notes text not null,
  client_responses jsonb not null,
  constraint builtin_scenario_secrets_responses_check
    check (client_responses = '{}'::jsonb or private.valid_client_responses(1, client_responses))
);

alter table private.builtin_scenario_secrets enable row level security;
revoke all on table private.builtin_scenario_secrets from public, anon, authenticated;

-- Built-in content is loaded from an instructor-held, git-ignored secret pack.
-- Never commit instructor notes, staged variants, or scripted client replies.

create or replace function public.get_builtin_scenario_instructor_notes()
returns table (scenario_id text, instructor_notes text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'admin_required' using errcode='42501';
  end if;
  return query
    select secret.scenario_id, secret.instructor_notes
    from private.builtin_scenario_secrets secret
    order by secret.scenario_id;
end;
$$;
revoke all on function public.get_builtin_scenario_instructor_notes() from public, anon, authenticated;
grant execute on function public.get_builtin_scenario_instructor_notes() to authenticated;

create or replace function public.create_lab_assignment_with_tickets(p_class_id uuid,p_week_label text,p_tickets jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_assignment_id uuid; v_ticket jsonb; v_ticket_id uuid; v_limit integer; v_responses jsonb; v_incident_id uuid;
begin
  if not (select private.is_admin()) then raise exception 'admin_required' using errcode='42501'; end if;
  if jsonb_typeof(p_tickets)<>'array' or jsonb_array_length(p_tickets)=0 then raise exception 'tickets_required'; end if;
  insert into public.lab_assignments(class_id,week_label,assigned_by) values(p_class_id,btrim(p_week_label),auth.uid()) returning id into v_assignment_id;
  for v_ticket in select value from jsonb_array_elements(p_tickets) item(value) loop
    v_limit:=coalesce((v_ticket->>'inquiry_limit')::integer,0);
    select secret.client_responses into v_responses
    from private.builtin_scenario_secrets secret
    where secret.scenario_id=v_ticket->>'scenario_id';
    if not found then v_responses:=coalesce(v_ticket->'client_responses','{}'::jsonb); end if;
    v_incident_id:=null;
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
