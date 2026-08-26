begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(40);

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

select * from finish();
rollback;
