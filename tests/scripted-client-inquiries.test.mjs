import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const migration = readFileSync(
  new URL("../supabase/migrations/20260826180023_scripted_client_inquiries.sql", import.meta.url),
  "utf8",
);

test("client replies are authored and snapshotted without an AI response path", () => {
  assert.match(app, /Scripted client inquiries/);
  assert.match(app, /Client response preview/);
  assert.match(app, /client_responses:scenario\.clientResponses/);
  assert.doesNotMatch(app, /openai|anthropic|generateClientResponse/i);
});

test("students must write before selecting purpose and submit through a narrow RPC", () => {
  assert.match(app, /disabled=\{!question\.trim\(\)\}/);
  assert.match(app, /submit_my_client_inquiry/);
  assert.doesNotMatch(app, /from\("ticket_client_inquiries"\)\s*\.(?:insert|update|upsert)/);
  assert.match(migration, /char_length\(btrim\(coalesce\(p_question, ''\)\)\) not between 1 and 500/);
});

test("server-side ownership, limits, privacy, and retries are enforced", () => {
  assert.match(migration, /where id = p_assigned_ticket_id and student_id = v_user_id/);
  assert.match(migration, /if v_count >= v_ticket\.inquiry_limit then raise exception 'inquiry_limit_reached'/);
  assert.match(migration, /ticket_client_inquiries_request_key unique/);
  assert.match(migration, /if found then return v_existing/);
  assert.match(migration, /student_id = \(select auth\.uid\(\)\)/);
  assert.match(migration, /revoke all on table public\.ticket_client_inquiries from anon, authenticated/);
});

test("instructor verification includes the private inquiry history", () => {
  assert.match(app, /Client inquiry history/);
  assert.match(app, /ticket_client_inquiries\(\*\)/);
  assert.match(migration, /ticket_client_inquiries: admin read/);
});
