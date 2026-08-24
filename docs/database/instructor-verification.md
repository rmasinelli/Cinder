# Instructor verification and sign-off

Issue #14 adds a focused instructor queue for the handoff between a student's
`Verification` status and final closure.

## Workflow

1. A student completes the concise Cinder closeout, writes the detailed work in
   the printed Service Log, and moves the ticket to `Verification`.
2. The instructor opens **Instructor Verification**, checks the ticket identity,
   student and team role, station, assets, last activity, and printed log.
3. **Approve & close** requires the instructor to confirm that the printed log
   was checked. The ticket moves from `Verification` to `Closed`.
4. **Return with feedback** requires actionable feedback and moves the ticket
   from `Verification` to `In Progress`.
5. A closed ticket may be **Reopened** with a reason, moving it to `Triage`.

Every decision is stored as an immutable `ticket_verification_reviews` event.
The existing lifecycle trigger also stores the associated status transition in
`ticket_status_history`, so approval, return, and reopening are visible to both
the student and instructor.

The student status RPC is tightened in the same migration: students may submit
work to `Verification`, but they cannot move a ticket to `Closed` or reopen a
closed ticket. Those transitions require the instructor review RPC.

## Authorization

Authenticated users may read review events only when they are the assigned
student or an administrator. Direct table writes are revoked. The
`review_assigned_ticket` RPC checks `private.is_admin()`, validates the current
ticket state, changes status, and records the review event in one transaction.
