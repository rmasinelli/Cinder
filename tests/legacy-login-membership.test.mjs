import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20260824201440_restore_legacy_login_memberships.sql", import.meta.url),
  "utf8",
);

test("login accepts current and legacy class membership links", () => {
  assert.match(migration,/class\.id = profile\.class_id/);
  assert.match(migration,/from public\.profile_classes membership/);
  assert.match(migration,/membership\.profile_id = profile\.id/);
  assert.match(migration,/membership\.class_id = class\.id/);
});

test("legacy compatibility preserves private exact-code resolution", () => {
  assert.match(migration,/upper\(class\.code\) = upper\(trim\(p_class_code\)\)/);
  assert.match(migration,/lower\(profile\.alias\) = lower\(trim\(p_alias\)\)/);
  assert.match(migration,/raise exception 'invalid_credentials'/);
  assert.match(migration,/revoke all on function public\.resolve_student_login/);
  assert.match(migration,/grant execute on function public\.resolve_student_login\(text, text\)[\s\S]*to anon, authenticated/);
});
