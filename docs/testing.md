# Classroom MVP test strategy

Issue #16 adds two complementary test layers:

- `npm test` checks browser workflow contracts and save/retry behavior without external services.
- `npm run test:mvp` runs the role-separated pgTAP suite against a disposable local Supabase database.

The database suite uses separate anonymous, student-one, student-two, and instructor contexts. It runs inside a transaction and rolls back its fixtures after every run.

## Access matrix

| Action | Anonymous | Assigned student | Other student | Instructor |
| --- | --- | --- | --- | --- |
| Enumerate classes or codes | Denied | Denied | Denied | Allowed |
| Enroll with an exact valid code | Sign in first | Allowed once | Allowed once | Not applicable |
| Read an assigned ticket | Denied | Own ticket only | Denied | Allowed |
| Create assignments and tickets | Denied | Denied | Denied | Allowed |
| Change ticket status | Denied | Own ticket, valid transitions only | Denied | Allowed by policy |
| Save a lab note | Denied | Own ticket only | Denied | Review/read only |
| Promote a profile to instructor | Denied | Denied | Denied | Allowed |
| Sign off and close | Denied | Denied | Denied | Allowed after verification |

## Local verification

Start the local stack, rebuild it from the active migrations, then run all checks:

```sh
supabase start
supabase db reset --local --no-seed
npm run test:mvp
npm run verify
```

Do not run the database suite against the linked production project. Pull requests run the same build, lint, application tests, and database workflow suite in GitHub Actions.
