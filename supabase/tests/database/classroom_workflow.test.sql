begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(80);

-- Fixed identities keep failures readable while the surrounding transaction
-- makes every run isolated and repeatable.
insert into public.classes (id, name, code, course_id, quarter, year, login_key)
values
  ('10000000-0000-0000-0000-000000000001', 'Hardware A', 'HARDWARE-A', 'hw', 'Fall', 2026, '11000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000002', 'Network A', 'NETWORK-A', 'net', 'Fall', 2026, '11000000-0000-0000-0000-000000000002');

insert into auth.users (id, email, encrypted_password, aud, role)
values
  ('20000000-0000-0000-0000-000000000001', 'student_one@11000000000000000000000000000001.cinder.io', '', 'authenticated', 'authenticated'),
  ('20000000-0000-0000-0000-000000000002', 'student_two@11000000000000000000000000000002.cinder.io', '', 'authenticated', 'authenticated'),
  ('20000000-0000-0000-0000-000000000003', 'instructor@example.edu', '', 'authenticated', 'authenticated');

insert into public.profiles (id, alias, role)
values ('20000000-0000-0000-0000-000000000003', 'Instructor', 'admin');

select ok(
  not has_table_privilege('anon', 'public.classes', 'SELECT'),
  'anonymous users cannot enumerate class codes'
);
select ok(
  not has_function_privilege('anon', 'public.update_my_assigned_ticket_status(uuid,text)', 'EXECUTE'),
  'anonymous users cannot update ticket status'
);
select ok(
  has_function_privilege('authenticated', 'public.update_my_assigned_ticket_status(uuid,text)', 'EXECUTE'),
  'authenticated users may call the ownership-scoped status RPC'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.complete_student_enrollment('Student One', array['HARDWARE-A'])$$,
  'student one enrolls with a valid private class code'
);
reset role;

select is(
  (select role from public.profiles where id = '20000000-0000-0000-0000-000000000001'),
  'student',
  'enrollment cannot choose a privileged role'
);
select is(
  (select count(*)::integer from public.profile_classes where profile_id = '20000000-0000-0000-0000-000000000001'),
  1,
  'enrollment creates the requested membership'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select lives_ok(
  $$select public.complete_student_enrollment('Student Two', array['NETWORK-A'])$$,
  'a separate student identity enrolls independently'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
select lives_ok($$
  insert into public.lab_assignments (id, class_id, week_label, assigned_by)
  values ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Week 1', '20000000-0000-0000-0000-000000000003')
$$, 'instructor creates a classroom assignment');
select lives_ok($$
  insert into public.assigned_tickets (
    id, assignment_id, student_id, course_id, week, title, description, priority
  ) values (
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'hw', 1, 'No POST', 'Desktop powers on without display', 'High'
  )
$$, 'instructor assigns a ticket to student one');
select lives_ok($$
  insert into public.readiness_checks (
    id, assignment_id, class_id, title, status, questions, created_by, published_at
  ) values (
    '50000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'Week 1 readiness', 'published',
    '[
      {"id":"q1","prompt":"Q1","options":[{"id":"a","text":"A"},{"id":"b","text":"B"}],"correct":"a","explanation":"E1"},
      {"id":"q2","prompt":"Q2","options":[{"id":"a","text":"A"},{"id":"b","text":"B"}],"correct":"a","explanation":"E2"},
      {"id":"q3","prompt":"Q3","options":[{"id":"a","text":"A"},{"id":"b","text":"B"}],"correct":"a","explanation":"E3"},
      {"id":"q4","prompt":"Q4","options":[{"id":"a","text":"A"},{"id":"b","text":"B"}],"correct":"a","explanation":"E4"},
      {"id":"q5","prompt":"Q5","options":[{"id":"a","text":"A"},{"id":"b","text":"B"}],"correct":"a","explanation":"E5"}
    ]'::jsonb,
    '20000000-0000-0000-0000-000000000003', now()
  )
$$, 'instructor publishes a five-question readiness check');
reset role;

select ok(
  not has_function_privilege('anon', 'public.submit_my_readiness_check(uuid,jsonb)', 'EXECUTE'),
  'anonymous users cannot submit readiness checks'
);
select ok(
  has_function_privilege('authenticated', 'public.submit_my_readiness_check(uuid,jsonb)', 'EXECUTE'),
  'authenticated students may call the ownership-scoped readiness RPC'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*)::integer from public.assigned_tickets), 0,
  'published readiness hides the student ticket before passing'
);
select is(
  (select count(*)::integer from public.get_my_readiness_checks()), 1,
  'assigned student receives their readiness check'
);
select ok(
  not ((select questions from public.get_my_readiness_checks())::text like '%correct%'),
  'sanitized readiness questions do not expose the answer key'
);
select lives_ok(
  $$select public.submit_my_readiness_check(
    '50000000-0000-0000-0000-000000000001',
    '{"q1":"b","q2":"b","q3":"b","q4":"b","q5":"b"}'::jsonb
  )$$,
  'student may submit an unsuccessful attempt'
);
select is(
  (select state from public.get_my_readiness_checks()), 'preparing',
  'an unsuccessful attempt puts the student at the preparation station'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select public.submit_my_readiness_check(
    '50000000-0000-0000-0000-000000000001',
    '{"q1":"a","q2":"a","q3":"a","q4":"a","q5":"a"}'::jsonb
  )$$,
  'P0002', 'readiness_check_not_found',
  'another student cannot submit or inspect an unassigned check'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.submit_my_readiness_check(
    '50000000-0000-0000-0000-000000000001',
    '{"q1":"a","q2":"a","q3":"a","q4":"a","q5":"b"}'::jsonb
  )$$,
  'student may retry and pass at eighty percent'
);
select is(
  (select passed from public.get_my_readiness_checks()), true,
  'passing marks only the authenticated student ready'
);
select is(
  (select count(*)::integer from public.assigned_tickets), 1,
  'passing automatically releases the student ticket'
);
select is(
  (select count(*)::integer from public.readiness_attempts), 2,
  'both attempts remain recorded for low-stakes tracking'
);
reset role;

select ok(not has_function_privilege('anon', 'public.submit_my_client_inquiry(uuid,uuid,text,text)', 'EXECUTE'), 'anonymous users cannot submit client inquiries');
select ok(has_function_privilege('authenticated', 'public.submit_my_client_inquiry(uuid,uuid,text,text)', 'EXECUTE'), 'authenticated students may call the ownership-scoped inquiry RPC');
select hasnt_column('public', 'assigned_tickets', 'client_responses', 'student-readable tickets do not contain the answer script');
select hasnt_column('public', 'ticket_client_inquiries', 'response_quality', 'student inquiry history does not label answer quality');
select ok(not has_table_privilege('authenticated', 'private.assigned_ticket_scripts', 'SELECT'), 'students cannot read the private answer scripts');

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
select lives_ok($$update public.assigned_tickets set inquiry_limit = 2 where id = '40000000-0000-0000-0000-000000000001'$$, 'instructor configures the ticket-specific inquiry limit');
select throws_ok(
  $$select public.create_lab_assignment_with_tickets('10000000-0000-0000-0000-000000000001','Invalid scripted assignment','[{"student_id":"20000000-0000-0000-0000-000000000001","scenario_id":"bad","course_id":"hw","week":1,"title":"Bad","description":"Bad","priority":"Medium","inquiry_limit":3}]'::jsonb)$$,
  'P0001', 'incomplete_client_responses',
  'an incomplete imported script is rejected atomically'
);
select is((select count(*)::integer from public.lab_assignments), 1, 'a rejected script does not leave an orphan assignment');
reset role;

insert into private.assigned_ticket_scripts (assigned_ticket_id, client_responses)
values ('40000000-0000-0000-0000-000000000001','{"scope":{"response":"Only the desktop is affected.","quality":"exact"},"symptom_error":{"response":"It beeps sometimes, I think.","quality":"ambiguous"}}'::jsonb);

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select throws_ok($$select public.submit_my_client_inquiry('40000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','  ','scope')$$, 'P0001', 'question_required', 'a blank question cannot reveal a response');
select lives_ok($$select public.submit_my_client_inquiry('40000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002','Is every workstation affected?','scope')$$, 'the ticket owner receives the scripted response');
select lives_ok($$select public.submit_my_client_inquiry('40000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002','Is every workstation affected?','scope')$$, 'retrying the same request is idempotent');
select is((select count(*)::integer from public.ticket_client_inquiries), 1, 'an idempotent retry does not consume another inquiry');
select lives_ok($$select public.submit_my_client_inquiry('40000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000003','What exactly do you hear?','symptom_error')$$, 'a second distinct inquiry is recorded');
select throws_ok($$select public.submit_my_client_inquiry('40000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000004','When did it start?','timing_change')$$, 'P0001', 'inquiry_limit_reached', 'the server enforces the ticket-specific inquiry limit');
select is((select count(*)::integer from public.ticket_client_inquiries), 2, 'only two inquiries are preserved at the configured limit');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select is((select count(*)::integer from public.ticket_client_inquiries), 0, 'another student cannot read private inquiry history');
select throws_ok($$select public.submit_my_client_inquiry('40000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000005','Can I inspect this?','scope')$$, 'P0001', 'ticket_not_found', 'another student cannot inquire on a ticket they do not own');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
select is((select count(*)::integer from public.ticket_client_inquiries), 2, 'the instructor can review complete inquiry history');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select is(
  (select count(*)::integer from public.assigned_tickets), 1,
  'student sees their assigned ticket'
);
select results_eq(
  $$update public.profiles set role = 'admin' where id = '20000000-0000-0000-0000-000000000001' returning role$$,
  $$select role from public.profiles where false$$,
  'student cannot promote their profile'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*)::integer from public.assigned_tickets), 0,
  'another student cannot read student one ticket'
);
select throws_ok(
  $$select public.update_my_assigned_ticket_status('40000000-0000-0000-0000-000000000001', 'Triage')$$,
  'P0002', 'ticket_not_found',
  'another student cannot change student one ticket'
);
select throws_ok(
  $$select public.save_my_lab_note('40000000-0000-0000-0000-000000000001', 'tampered')$$,
  'P0002', 'ticket_not_found',
  'another student cannot save notes on student one ticket'
);
select throws_ok(
  $$select public.review_assigned_ticket('40000000-0000-0000-0000-000000000001', 'Approved', true, null)$$,
  '42501', 'admin_required',
  'a student cannot perform instructor sign-off'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.update_my_assigned_ticket_status('40000000-0000-0000-0000-000000000001', 'Triage')$$,
  'student starts triage'
);
select lives_ok(
  $$select public.save_my_lab_note('40000000-0000-0000-0000-000000000001', 'Checked power and display path')$$,
  'student saves a concise triage note'
);
select lives_ok(
  $$select public.save_my_lab_note('40000000-0000-0000-0000-000000000001', 'Checked power, display path, and known-good cable')$$,
  'retrying a note save safely updates the same record'
);
select is(
  (select count(*)::integer from public.lab_notes), 1,
  'a save retry does not duplicate the note'
);
select is(
  (select content from public.lab_notes),
  'Checked power, display path, and known-good cable',
  'the successful retry contains the latest note'
);
select lives_ok(
  $$select public.update_my_assigned_ticket_status('40000000-0000-0000-0000-000000000001', 'Escalated')$$,
  'student escalates from triage when the boundary is reached'
);
select lives_ok(
  $$select public.update_my_assigned_ticket_status('40000000-0000-0000-0000-000000000001', 'In Progress')$$,
  'student resumes work after escalation'
);
select lives_ok(
  $$select public.update_my_assigned_ticket_status('40000000-0000-0000-0000-000000000001', 'Verification')$$,
  'student submits completed work for verification'
);
select throws_ok(
  $$select public.update_my_assigned_ticket_status('40000000-0000-0000-0000-000000000001', 'Closed')$$,
  '42501', 'instructor_signoff_required',
  'student cannot close their own ticket'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
select lives_ok(
  $$select public.review_assigned_ticket('40000000-0000-0000-0000-000000000001', 'Approved', true, 'Printed Service Log checked')$$,
  'instructor signs off and closes the ticket'
);
select is(
  (select status from public.assigned_tickets where id = '40000000-0000-0000-0000-000000000001'),
  'Closed',
  'the end-to-end classroom workflow finishes closed'
);
select is(
  (select count(*)::integer from public.ticket_status_history where assigned_ticket_id = '40000000-0000-0000-0000-000000000001'),
  6,
  'the lifecycle keeps an auditable status history'
);
reset role;

-- Linked team incidents keep the shared result visible while protecting each
-- student's child ticket and individual evidence.
set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
select lives_ok($$
  select public.create_lab_assignment_with_tickets(
    '10000000-0000-0000-0000-000000000001', 'Week 2 teams',
    '[
      {"student_id":"20000000-0000-0000-0000-000000000001","scenario_id":"team-a","course_id":"hw","week":2,"title":"Shared POST incident","description":"Diagnose the shared workstation.","priority":"Medium","inquiry_limit":0,"team_key":"W2-teams1","team_name":"Ember Team 1","color_name":"Ember","color_hex":"#E8922E","team_role":"Hands-on technician"},
      {"student_id":"20000000-0000-0000-0000-000000000002","scenario_id":"team-a","course_id":"hw","week":2,"title":"Shared POST incident","description":"Diagnose the shared workstation.","priority":"Medium","inquiry_limit":0,"team_key":"W2-teams1","team_name":"Ember Team 1","color_name":"Ember","color_hex":"#E8922E","team_role":"Evidence / documentation"},
      {"student_id":"20000000-0000-0000-0000-000000000003","scenario_id":"team-b","course_id":"hw","week":2,"title":"Separate incident","description":"A separate team incident.","priority":"Medium","inquiry_limit":0,"team_key":"W2-teams2","team_name":"Sky Team 2","color_name":"Sky","color_hex":"#38BDF8","team_role":"Client communication / lead"}
    ]'::jsonb
  )
$$, 'instructor creates named team parents with one child ticket per member');
reset role;

select is((select count(*)::integer from public.team_incidents), 2, 'one parent incident is created per named team');
select is((select count(*)::integer from public.assigned_tickets where team_incident_id is not null), 3, 'each team member receives an individual child ticket');

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select is((select count(*)::integer from public.team_incidents), 1, 'a student sees only their own parent incident');
select is((select count(*)::integer from public.assigned_tickets where team_incident_id is not null), 1, 'a student cannot read a teammate child ticket');
select is((select count(*)::integer from public.team_roster((select id from public.assigned_tickets where team_incident_id is not null))), 2, 'the sanitized roster exposes both team members');
select is((select count(*)::integer from public.team_contributions), 1, 'a student cannot read a teammate individual contribution');
select lives_ok($$select public.save_my_team_contribution((select id from public.assigned_tickets where team_incident_id is not null),'Hands-on technician','Reseated the memory and recorded the POST result.')$$, 'a student records their own contribution');
select lives_ok($$select public.save_my_team_shared_outcome((select id from public.assigned_tickets where team_incident_id is not null),'The team verified POST after reseating memory.')$$, 'a team member records the shared verified outcome');
select throws_ok(
  $$select public.save_my_team_contribution((select assigned_ticket_id from public.team_contributions where student_id='20000000-0000-0000-0000-000000000002'),'Evidence / documentation','Attempted to alter a teammate contribution.')$$,
  'P0002', 'team_ticket_not_found', 'a student cannot alter a teammate contribution'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
update public.assigned_tickets set status='Triage' where student_id='20000000-0000-0000-0000-000000000001' and team_incident_id is not null;
update public.assigned_tickets set status='In Progress' where student_id='20000000-0000-0000-0000-000000000001' and team_incident_id is not null;
update public.assigned_tickets set status='Verification' where student_id='20000000-0000-0000-0000-000000000001' and team_incident_id is not null;
select throws_ok(
  $$select public.review_assigned_ticket((select id from public.assigned_tickets where student_id='20000000-0000-0000-0000-000000000001' and team_incident_id is not null),'Approved',true,null)$$,
  '22023', 'team_contributions_incomplete', 'team sign-off waits for every contribution and verification state'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
select is((select shared_outcome from public.team_incidents),'The team verified POST after reseating memory.','a teammate sees the shared outcome without seeing individual evidence');
select throws_ok($$select public.save_my_team_shared_outcome((select id from public.assigned_tickets where team_incident_id is not null),'A stale browser tries to replace the shared result.',null)$$,'P0001','shared_outcome_changed','a stale team panel cannot silently overwrite a teammate outcome');
select lives_ok($$select public.save_my_team_contribution((select id from public.assigned_tickets where team_incident_id is not null),'Evidence / documentation','Recorded the shared POST code and verification evidence.')$$, 'the teammate records separate individual evidence');
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
update public.assigned_tickets set status='Triage'
where student_id='20000000-0000-0000-0000-000000000002' and team_incident_id is not null;
update public.assigned_tickets set status='In Progress'
where student_id='20000000-0000-0000-0000-000000000002' and team_incident_id is not null;
update public.assigned_tickets set status='Verification'
where student_id='20000000-0000-0000-0000-000000000002' and team_incident_id is not null;
select lives_ok(
  $$select public.review_assigned_ticket((select id from public.assigned_tickets where student_id='20000000-0000-0000-0000-000000000001' and team_incident_id is not null),'Approved',true,'Team outcome and individual work checked')$$,
  'instructor may sign off after all team members are ready'
);
select lives_ok(
  $$select public.review_assigned_ticket((select id from public.assigned_tickets where student_id='20000000-0000-0000-0000-000000000002' and team_incident_id is not null),'Approved',true,'Second individual contribution checked')$$,
  'closing the first child does not block sign-off for the next teammate'
);
select is(
  (select count(*)::integer from public.assigned_tickets where team_incident_id=(select team_incident_id from public.assigned_tickets where student_id='20000000-0000-0000-0000-000000000001' and team_incident_id is not null) and status='Closed'),
  2, 'every team child ticket can reach Closed'
);
reset role;

select has_table(
  'private', 'builtin_scenario_secrets',
  'built-in answer keys live outside the public schema'
);
select ok(
  not has_table_privilege('authenticated', 'private.builtin_scenario_secrets', 'SELECT'),
  'authenticated browsers cannot select built-in answer keys'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$select * from public.get_builtin_scenario_instructor_notes()$$,
  '42501', 'admin_required',
  'students cannot retrieve instructor notes'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
select is(
  (select count(*)::integer from public.get_builtin_scenario_instructor_notes()),
  37,
  'instructors receive notes for every built-in scenario without client scripts'
);
select lives_ok($$
  select public.create_lab_assignment_with_tickets(
    '10000000-0000-0000-0000-000000000001', 'Private built-in script probe',
    '[{"student_id":"20000000-0000-0000-0000-000000000001","scenario_id":"sc-hw-f26-05","course_id":"hw","week":5,"title":"Private script probe","description":"Safe browser payload.","priority":"High","inquiry_limit":2}]'::jsonb
  )
$$, 'assignment creation resolves built-in client scripts without receiving them from the browser');
reset role;

select * from finish();
rollback;
