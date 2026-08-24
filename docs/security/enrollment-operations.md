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
