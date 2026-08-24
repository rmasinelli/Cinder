# Enrollment-code operations

Issue: [#8 — Make class enrollment codes private and controlled](https://github.com/rmasinelli/Cinder/issues/8)

Raw class rows and codes are never readable by anonymous users or students.
The join screen submits an exact set of one to three codes to
`validate_enrollment_codes`; it receives sanitized metadata only when every
code is open, unexpired, and valid. Invalid requests return one generic result
without partial matches.

## Instructor rotation

In **Admin Panel → Enrolled Students**, select **Rotate Code** for the class and
enter a new code. Codes must contain 8–64 letters, numbers, or hyphens. Rotation
changes only the enrollment secret; the class's stable login key and existing
memberships do not change, so enrolled accounts continue to work.

For a scheduled expiration or temporarily closed enrollment, call the same
admin-only RPC with the desired settings:

```sql
select public.rotate_class_enrollment_code(
  p_class_id := '<class uuid>',
  p_new_code := 'FALL2026-HW-NEW',
  p_expires_at := '2026-10-15 23:59:59-07'::timestamptz,
  p_enrollment_open := true
);
```

To close enrollment immediately without changing memberships, retain the
current code and pass `p_enrollment_open := false`. Reopen by rotating to a new
code and passing `true`.

## Late add

An authenticated student who already has a profile may join one additional
current class through `add_my_class_by_code`. The function derives the student
from `auth.uid()`, rejects duplicate/invalid/expired codes, and enforces the
three-class maximum. Until a dedicated settings screen is added, an instructor
should have the student use the normal multi-code join flow when the account is
first created; later additions can be performed from an authenticated client
that invokes this RPC.

## Operational checks

- Rotate codes after an accidental disclosure and between cohorts.
- Prefer an expiration date near the end of the add/drop period.
- Do not reuse old codes.
- Closing or rotating enrollment never removes `profile_classes` rows.
- Password reset and sign-in use the current code plus the student's alias;
  neither endpoint reveals whether a different class exists.

## Production verification — August 24, 2026

The migration was applied atomically to the Cinder production project after a
successful forced-rollback dry run. Preflight confirmed there were no duplicate
primary-class aliases or incompatible existing codes.

Live role tests, all executed in rollback-only transactions, confirmed:

- Anonymous direct access to `classes` is denied.
- Invalid and mixed valid/invalid code sets return the same generic failure.
- A valid exact code returns one sanitized class match.
- Students see no raw class rows and can load only their sanitized memberships.
- An invalid late-add attempt fails without changing enrollment.
- Instructors can read class controls and rotate a code.
- The old code fails immediately after rotation, the new code succeeds, and an
  existing student login continues to resolve because `login_key` is stable.

The refreshed Supabase Security Advisor reported **0 errors**. Its warnings
identify the intentionally callable enrollment/classroom RPCs and the existing
project-level leaked-password-protection setting; every new privileged RPC has
a pinned empty `search_path`, an explicit caller/ownership check where needed,
and explicit execution grants.
