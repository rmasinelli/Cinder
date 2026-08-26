# Readiness checks and preparation station

Issue #40 adds a low-stakes gate between Monday preparation and Wednesday hands-on work.

## Instructor workflow

1. Push a lab assignment from **Labs → Push Labs**.
2. Open **Labs → Readiness Checks** and select that assignment.
3. Author exactly five multiple-choice questions, mark one correct option per question, and add an explanation.
4. Preview the student view, save a draft, then publish it.
5. Use the roster to distinguish `absent`, `preparing`, `ready`, and `complete` students.

A published check may be corrected in place. Previously successful attempts remain successful so a wording correction does not relock a student's released ticket.

## Student workflow

- A published check hides only that student's assigned ticket until they score at least 80%.
- An unsuccessful attempt shows explanations and places the student in the preparation-station state.
- Retrying and passing releases the ticket immediately; a teammate's readiness never controls another student's child ticket.
- Hardware and Networking checks remain separate because each check belongs to one class assignment.
- The first-session safety walkthrough is acknowledged once per enrolled class and is separate from weekly readiness.

## Security boundary

The browser never receives direct table access to readiness answer keys and never inserts attempts. `get_my_readiness_checks` returns only question IDs, prompts, and options. `submit_my_readiness_check` derives the student from `auth.uid()`, checks ticket ownership, scores on the server, records the attempt, and returns feedback only after submission.

All readiness tables use RLS and explicit grants. Privileged functions pin an empty `search_path`, revoke default execution, and grant only the required authenticated entry points.

## Verification

Run:

```bash
npm run verify
npx --yes supabase@2.115.0 db reset --local --no-seed
npx --yes supabase@2.115.0 test db supabase/tests/database/classroom_workflow.test.sql
npx --yes supabase@2.115.0 db advisors --local --type security --fail-on error
```

The pgTAP workflow verifies answer-key hiding, assignment ownership, retry state, the 80% threshold, and automatic ticket release.
