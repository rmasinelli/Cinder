import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20260824195145_instructor_verification_signoff.sql", import.meta.url),
  "utf8",
);
const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("the instructor queue focuses on tickets awaiting verification", () => {
  assert.match(app,/title="Instructor Verification"/);
  assert.match(app,/ticket\.status==="Verification"/);
  for (const field of ["team_role","station_id","asset_ids","Last activity"])
    assert.match(app,new RegExp(field));
});

test("only an authenticated administrator can perform review actions", () => {
  assert.match(migration,/if not \(select private\.is_admin\(\)\)/);
  assert.match(migration,/revoke all on function public\.review_assigned_ticket/);
  assert.match(migration,/grant execute on function public\.review_assigned_ticket[\s\S]*to authenticated/);
  assert.match(app,/supabase\.rpc\("review_assigned_ticket"/);
  assert.doesNotMatch(app,/from\("ticket_verification_reviews"\)\s*\.(?:insert|update|upsert)\(/);
});

test("approval proves the printed entry was checked", () => {
  assert.match(migration,/p_action = 'Approved' and not coalesce\(p_manual_checked, false\)/);
  assert.match(migration,/ticket_verification_reviews_approval_check/);
  assert.match(app,/I checked the student’s printed Service Log entry/);
});

test("returns and reopening require actionable feedback", () => {
  assert.match(migration,/p_action in \('Returned', 'Reopened'\)[\s\S]*actionable_feedback_required/);
  assert.match(migration,/ticket_verification_reviews_feedback_check/);
  assert.match(app,/Return with feedback/);
});

test("review actions use the service-desk lifecycle and remain readable in history", () => {
  assert.match(migration,/when 'Approved' then 'Closed'/);
  assert.match(migration,/when 'Returned' then 'In Progress'/);
  assert.match(migration,/when 'Reopened' then 'Triage'/);
  assert.match(migration,/insert into public\.ticket_verification_reviews/);
  assert.match(app,/Instructor \{entry\.action\}/);
});

test("students cannot bypass instructor closure or reopening", () => {
  assert.match(migration,/p_status = 'Closed'[\s\S]*instructor_signoff_required/);
  assert.match(migration,/v_current_status = 'Closed'[\s\S]*instructor_reopen_required/);
});
