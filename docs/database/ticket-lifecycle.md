# Classroom ticket lifecycle

Cinder assigned tickets use the same identifier in the student view, instructor
queue, and printed Field Journal. The database UUID remains the internal key;
students should write the readable identifier, such as `HW-26F-0001`, in the
manual.

The identifier is generated once by Postgres:

- `HW` — course code
- `26` — two-digit class year
- `F` — quarter (`F`, `W`, `S`, or `U`)
- `0001` — database sequence number

Sequence gaps are acceptable. Numbers are unique and stable, but a rolled-back
transaction can consume a number.

## Allowed transitions

| Current | Allowed next status |
| --- | --- |
| New | Triage |
| Triage | In Progress, Escalated |
| In Progress | Waiting, Escalated, Verification |
| Waiting | In Progress, Escalated |
| Escalated | In Progress, Waiting, Verification |
| Verification | In Progress, Closed |
| Closed | Triage (reopen) |

Postgres enforces these transitions for students and instructors. The UI only
offers valid next steps, but the trigger remains the source of truth.

Every initial state and subsequent status change is appended to
`ticket_status_history` with the actor alias and server timestamp. A
`Closed → Triage` transition is explicitly marked as a reopen. Students can
read history only for their own assigned tickets; instructors can read all
history.
