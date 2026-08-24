# Classroom data access matrix

Issue: [#7 — Lock down Supabase authorization and RLS boundaries](https://github.com/rmasinelli/Cinder/issues/7)

This matrix documents the intended Data API boundary after
`20260824173200_harden_classroom_rls.sql` is applied. `service_role` access is
not listed because it bypasses RLS and must never be used in the browser.

| Resource | Anonymous | Student | Instructor/admin |
| --- | --- | --- | --- |
| `classes` | Read for current enrollment flow | Read | Read, create, edit, delete |
| `profiles` | None | Read own; create once through `complete_student_enrollment` | Read and edit all |
| `profile_classes` | None | Read own; initial enrollment only through `complete_student_enrollment` | Read, add, remove |
| `ticket_templates` | None | Read | Read, create, edit, delete |
| `lab_assignments` | None | Read assignments for enrolled classes | Read, create, delete |
| `assigned_tickets` | None | Read own; change own status through `update_my_assigned_ticket_status` | Read, create, edit, delete |
| `lab_notes` | None | Read own notes for own tickets; save through `save_my_lab_note` | Read and delete |
| Password-reset RPC | Call with alias, class code, and one-time PIN | Call with alias, class code, and one-time PIN | Issue PIN through admin-only RPC |
| Assignment-reset RPC | None | None | Execute |

## Required negative checks

The repository test suite statically verifies all of these boundaries with
`npm test`:

- Browser code has no direct student insert/update for protected profile,
  enrollment, assigned-ticket, or note rows.
- Every classroom table explicitly enables RLS.
- No student policy permits direct protected writes.
- Instructor write policies are present and use the private admin predicate.
- Every `security definer` function pins an empty `search_path` and has an
  explicit execution grant.

After applying the migration to a staging or linked Supabase project, verify
the runtime boundary with separate student and instructor accounts:

1. As a student, attempt direct updates to `profiles.role`, `class_id`, and
   `reset_pin`; each request must return no updated row or a permission error.
2. As a student, attempt to insert a `profile_classes` row and to update an
   `assigned_tickets.student_id`; each request must fail.
3. As a student, call the ticket-status and note RPCs for another student's
   ticket; each call must fail with `ticket_not_found`.
4. As a student, confirm status changes and note saves succeed for an owned
   ticket.
5. As an instructor, confirm class, enrollment, template, assignment, and
   assigned-ticket management still succeeds.
6. Run Supabase Database Linter and Security Advisor. Attach the output to
   Issue #7 before closing it.

The anonymous class-code lookup remains intentionally available for the current
join flow. Restricting and rotating enrollment codes is tracked in Issue #8.

## Production verification — August 24, 2026

Migration `20260824173200_harden_classroom_rls.sql` was applied atomically to
the Cinder `main` production project after confirming a recent backup. The
pre/post record inventory was unchanged.

Student-role tests used an existing student identity and forced a transaction
rollback after collecting the result:

- Other profiles were not visible.
- Protected profile and membership changes affected no rows.
- Direct note insertion was denied.
- Own ticket-status RPC: passed
- Other-ticket status RPC: denied
- Own note RPC: passed

Instructor-role tests also ran inside a forced-rollback transaction:

- Admin predicate and full profile visibility: passed
- Profile and assigned-ticket management: passed
- Temporary class create/delete: passed
- Temporary membership create/delete: passed

The post-migration catalog contains the expected explicit classroom policies
and none of the legacy student-write policies. All privileged functions have an
empty pinned `search_path` and explicit role execution grants.

The refreshed Supabase Security Advisor reported **0 errors** and **8
warnings**. Seven warnings identify the intentionally callable privileged RPCs;
their caller/ownership checks and execution grants are covered above. The
remaining warning is the project-level **Leaked Password Protection Disabled**
setting and is not caused by this migration.
