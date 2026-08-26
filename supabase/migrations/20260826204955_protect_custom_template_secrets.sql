create table private.ticket_template_secrets (
  template_id text primary key references public.ticket_templates(id) on delete cascade,
  instructor_notes text not null default '',
  client_responses jsonb not null default '{}',
  constraint ticket_template_secrets_responses_check
    check (client_responses='{}'::jsonb or private.valid_client_responses(1,client_responses))
);
alter table private.ticket_template_secrets enable row level security;
revoke all on table private.ticket_template_secrets from public,anon,authenticated;

insert into private.ticket_template_secrets(template_id,instructor_notes,client_responses)
select id,coalesce(scenario->>'instructorNotes',''),coalesce(scenario->'clientResponses','{}'::jsonb)
from public.ticket_templates;

update public.ticket_templates
set scenario=scenario-'instructorNotes'-'clientResponses';

alter table public.ticket_templates
  add constraint ticket_templates_public_scenario_check
  check (not (scenario ?| array['instructorNotes','clientResponses']));

create or replace function public.get_custom_ticket_templates()
returns setof jsonb language plpgsql security definer set search_path='' as $$
begin
  if not (select private.is_admin()) then raise exception 'admin_required' using errcode='42501'; end if;
  return query
  select to_jsonb(template) || jsonb_build_object(
    'scenario',template.scenario || jsonb_build_object(
      'instructorNotes',secret.instructor_notes,
      'clientResponses',secret.client_responses
    )
  )
  from public.ticket_templates template
  join private.ticket_template_secrets secret on secret.template_id=template.id
  order by template.course_id,template.week,template.title;
end; $$;
revoke all on function public.get_custom_ticket_templates() from public,anon,authenticated;
grant execute on function public.get_custom_ticket_templates() to authenticated;

create or replace function public.save_custom_ticket_templates(p_templates jsonb)
returns setof jsonb language plpgsql security definer set search_path='' as $$
declare item jsonb; v_id text; v_scenario jsonb; v_limit integer; v_responses jsonb;
begin
  if not (select private.is_admin()) then raise exception 'admin_required' using errcode='42501'; end if;
  if jsonb_typeof(p_templates)<>'array' or jsonb_array_length(p_templates)=0 then raise exception 'templates_required'; end if;
  for item in select value from jsonb_array_elements(p_templates) entry(value) loop
    v_id=nullif(btrim(item->>'id'),'');
    if v_id is null then raise exception 'template_id_required'; end if;
    v_scenario=coalesce(item->'scenario','{}'::jsonb);
    v_limit=coalesce((v_scenario->>'inquiryLimit')::integer,0);
    v_responses=coalesce(v_scenario->'clientResponses','{}'::jsonb);
    if v_limit not between 0 and 3 then raise exception 'invalid_inquiry_limit'; end if;
    if not private.valid_client_responses(v_limit,v_responses) then raise exception 'incomplete_client_responses'; end if;
    insert into public.ticket_templates(id,title,description,priority,categories,week_tag,scenario,course_id,week,mode)
    values(v_id,item->>'title',item->>'description',coalesce(item->>'priority','Medium'),
      coalesce(array(select jsonb_array_elements_text(coalesce(item->'categories','[]'::jsonb))),'{}'),
      nullif(item->>'week_tag',''),v_scenario-'instructorNotes'-'clientResponses',
      item->>'course_id',(item->>'week')::integer,coalesce(item->>'mode','broadcast'))
    on conflict(id) do update set title=excluded.title,description=excluded.description,
      priority=excluded.priority,categories=excluded.categories,week_tag=excluded.week_tag,
      scenario=excluded.scenario,course_id=excluded.course_id,week=excluded.week,mode=excluded.mode;
    insert into private.ticket_template_secrets(template_id,instructor_notes,client_responses)
    values(v_id,coalesce(v_scenario->>'instructorNotes',''),v_responses)
    on conflict(template_id) do update set instructor_notes=excluded.instructor_notes,client_responses=excluded.client_responses;
  end loop;
  return query select * from public.get_custom_ticket_templates();
end; $$;
revoke all on function public.save_custom_ticket_templates(jsonb) from public,anon,authenticated;
grant execute on function public.save_custom_ticket_templates(jsonb) to authenticated;

create or replace function public.delete_custom_ticket_template(p_template_id text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not (select private.is_admin()) then raise exception 'admin_required' using errcode='42501'; end if;
  delete from public.ticket_templates where id=p_template_id;
end; $$;
revoke all on function public.delete_custom_ticket_template(text) from public,anon,authenticated;
grant execute on function public.delete_custom_ticket_template(text) to authenticated;

create or replace function public.create_lab_assignment_with_tickets(p_class_id uuid,p_week_label text,p_tickets jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_assignment_id uuid; v_ticket jsonb; v_ticket_id uuid; v_limit integer; v_responses jsonb; v_incident_id uuid;
begin
  if not (select private.is_admin()) then raise exception 'admin_required' using errcode='42501'; end if;
  if jsonb_typeof(p_tickets)<>'array' or jsonb_array_length(p_tickets)=0 then raise exception 'tickets_required'; end if;
  insert into public.lab_assignments(class_id,week_label,assigned_by) values(p_class_id,btrim(p_week_label),auth.uid()) returning id into v_assignment_id;
  for v_ticket in select value from jsonb_array_elements(p_tickets) item(value) loop
    v_limit:=coalesce((v_ticket->>'inquiry_limit')::integer,0);
    select secret.client_responses into v_responses from private.builtin_scenario_secrets secret where secret.scenario_id=v_ticket->>'scenario_id';
    if not found then
      select secret.client_responses into v_responses from private.ticket_template_secrets secret where secret.template_id=v_ticket->>'scenario_id';
    end if;
    if not found then v_responses:='{}'::jsonb; end if;
    v_incident_id:=null;
    if v_limit not between 0 and 3 then raise exception 'invalid_inquiry_limit'; end if;
    if not private.valid_client_responses(v_limit,v_responses) then raise exception 'incomplete_client_responses'; end if;
    if nullif(v_ticket->>'team_key','') is not null then
      insert into public.team_incidents(assignment_id,team_key,team_name,color_name,color_hex,title,description)
      values(v_assignment_id,v_ticket->>'team_key',v_ticket->>'team_name',v_ticket->>'color_name',v_ticket->>'color_hex',v_ticket->>'title',v_ticket->>'description')
      on conflict(assignment_id,team_key) do update set team_name=excluded.team_name,color_name=excluded.color_name,
        color_hex=excluded.color_hex,title=excluded.title,description=excluded.description returning id into v_incident_id;
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
