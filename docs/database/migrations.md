# Cinder database migrations

The ordered SQL files in `supabase/migrations/` are the only authoritative
database setup and upgrade path:

1. `20260824181523_authoritative_baseline.sql` creates or completes all
   classroom and knowledge-base objects, constraints, indexes, grants, and
   knowledge-base policies.
2. `20260824181524_classroom_authorization.sql` installs the audited classroom
   RLS policies and narrow student-write RPCs from Issue #7.
3. `20260824181525_private_enrollment.sql` makes class codes private and
   installs the enrollment and login RPCs from Issue #8.

Each migration is designed to work both on an empty database and on Cinder's
existing database. The baseline uses idempotent creation and column-completion
statements, so upgrading the current project does not require a destructive
reset or hunting for an earlier patch.

## Clean local or staging setup

Docker must be running. From the repository root:

```bash
npx supabase start
npx supabase db reset
npm test
npm run build
```

`supabase db reset` is appropriate only for a disposable local database. For a
hosted staging project, link to that project and use `npx supabase db push`
after reviewing the CLI's dry-run output.

## Existing production project

Never run `supabase db reset --linked` (or any equivalent reset) against the
current project. The safe upgrade sequence is:

1. Back up the hosted database.
2. Apply and smoke-test this exact migration path on an empty local or staging
   database.
3. Run `npx supabase db push --dry-run` against the linked project and review
   the proposed migration list.
4. Run `npx supabase db push` only during an approved deployment window.
5. Verify the remote and local migration lists agree with
   `npx supabase migration list`.
6. Smoke-test instructor sign-in, student enrollment, class management,
   assignment push, student status/note writes, and knowledge-base access.

Do not apply SQL from `supabase/legacy/` to repair a deployment. If a future
upgrade is needed, create a new ordered migration with
`npx supabase migration new <name>`.

## Optional knowledge content

Files under `supabase/seeds/knowledge/` are content imports, not schema
migrations. They contain author/profile identifiers from the established
project, so automatic seeding is intentionally disabled in `config.toml`.
Import them only after the referenced profiles exist, in filename order, and
only into an environment where those identifiers are valid.

## Adding a migration

```bash
npx supabase migration new descriptive_name
```

Keep the generated timestamped file in `supabase/migrations/`, make upgrades
safe for the current project, and extend `tests/migration-path.test.mjs` when
the authoritative contract changes.
