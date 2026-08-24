import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20260824191422_classroom_ticket_lifecycle.sql", import.meta.url),
  "utf8",
);
const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const constants = readFileSync(new URL("../src/data/constants.js", import.meta.url), "utf8");

test("tickets receive stable classroom-readable identifiers", () => {
  assert.match(migration, /create sequence if not exists public\.assigned_ticket_number_seq/);
  assert.match(migration, /add column if not exists ticket_number text/);
  assert.match(migration, /create unique index if not exists assigned_tickets_ticket_number_key/);
  assert.match(migration, /lpad\(nextval\('public\.assigned_ticket_number_seq'\)::text, 4, '0'\)/);
  assert.match(app, /at\.ticket_number\|\|at\.id\?\.slice/);
  assert.match(app, /ticket\.ticket_number/);
});

test("the service-desk lifecycle is enforced in Postgres", () => {
  for (const status of ["New","Triage","In Progress","Waiting","Escalated","Verification","Closed"]) {
    assert.match(migration,new RegExp(`'${status.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}'`));
    assert.match(constants,new RegExp(status.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")));
  }
  assert.match(migration, /create trigger enforce_classroom_ticket_transition/);
  assert.match(migration, /invalid_status_transition/);
  assert.match(constants, /Closed: \["Triage"\]/);
  assert.match(app, /STATUS_TRANSITIONS\[at\.status\]/);
});

test("status history records actor, time, and reopening", () => {
  assert.match(migration, /create table if not exists public\.ticket_status_history/);
  assert.match(migration, /changed_by_alias text not null/);
  assert.match(migration, /changed_at timestamptz not null default now\(\)/);
  assert.match(migration, /tg_op = 'UPDATE' and old\.status = 'Closed'/);
  assert.match(migration, /alter table public\.ticket_status_history enable row level security/);
  assert.match(app, /\.from\("ticket_status_history"\)/);
  assert.match(app, /Status History/);
});

test("students still change only their own ticket through the narrow RPC", () => {
  assert.match(migration, /where id = p_ticket_id\s+and student_id = v_user_id/);
  assert.match(migration, /revoke all on function public\.update_my_assigned_ticket_status/);
  assert.doesNotMatch(app, /from\("assigned_tickets"\)\s*\.update\(/);
});
