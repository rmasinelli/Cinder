import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const migration = readFileSync(
  new URL("../supabase/migrations/20260826165024_readiness_checks.sql", import.meta.url),
  "utf8",
);

test("readiness answer keys stay behind ownership-scoped RPCs", () => {
  assert.match(migration, /revoke all on table public\.readiness_checks from anon, authenticated/);
  assert.match(migration, /jsonb_build_object\(\s*'id'.*?'prompt'.*?'options'/s);
  assert.doesNotMatch(
    migration.match(/create or replace function public\.get_my_readiness_checks\(\)[\s\S]*?\$\$;/)?.[0] || "",
    /'correct'/,
  );
  assert.match(migration, /revoke all on function public\.submit_my_readiness_check\(uuid, jsonb\)/);
  assert.match(migration, /grant execute on function public\.submit_my_readiness_check\(uuid, jsonb\) to authenticated/);
});

test("ticket release is enforced in RLS for the authenticated student", () => {
  assert.match(migration, /student_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /private\.has_passed_readiness\(assignment_id, \(select auth\.uid\(\)\)\)/);
  assert.match(migration, /ticket\.student_id = v_user_id/);
  assert.match(migration, /v_score := v_correct \* 20/);
  assert.match(migration, /v_passed := v_score >= v_check\.passing_percent/);
});

test("the UI supports authoring, preparation, retry, and automatic release", () => {
  for (const rpc of ["get_my_readiness_checks", "submit_my_readiness_check", "readiness_roster"]) {
    assert.match(app, new RegExp(`supabase\\.rpc\\(\"${rpc}\"`));
  }
  assert.match(app, /Preparation station/);
  assert.match(app, /Publish correction/);
  assert.match(app, /await refreshAssignedTickets\(session\)/);
  assert.doesNotMatch(app, /from\("readiness_attempts"\)\.(?:insert|update|upsert)/);
});

test("all readiness tables enable RLS with explicit Data API grants", () => {
  for (const table of ["readiness_checks", "readiness_attempts", "safety_acknowledgments"]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security;`));
    assert.match(migration, new RegExp(`revoke all on table public\\.${table} from anon, authenticated;`));
  }
});
