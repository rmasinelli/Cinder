import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../supabase/migrations/20260824193301_link_printed_field_journal.sql", import.meta.url),
  "utf8",
);
const app = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");

test("the shared link contains every required print-to-ticket field", () => {
  for (const field of [
    "manual_type","service_log_number","station_id","asset_ids","team_role",
    "impact","urgency","chosen_priority","clarifying_question","client_response",
    "escalation_reason","verification_checklist","client_resolution",
  ]) assert.match(migration,new RegExp(`\\b${field}\\b`));
});

test("detailed troubleshooting narrative remains in the printed manual", () => {
  assert.match(app,/Detailed tool, action, reason, and observation notes stay in the printed manual/);
  assert.match(app,/Do not copy the troubleshooting log/);
  assert.doesNotMatch(migration,/tool_action|observation_log|troubleshooting_steps/);
});

test("students save links only through an ownership-scoped RPC", () => {
  assert.match(migration,/where ticket\.id = p_assigned_ticket_id\s+and ticket\.student_id = v_user_id/);
  assert.match(migration,/revoke all on function public\.save_my_field_journal_link/);
  assert.match(app,/supabase\.rpc\("save_my_field_journal_link"/);
  assert.doesNotMatch(app,/from\("field_journal_links"\)\s*\.(?:insert|update|upsert)\(/);
});

test("Cinder and the printed journal expose a bidirectional reference", () => {
  assert.match(app,/TKT-\$\{String\(form\.serviceLogNumber\|\|0\)\.padStart\(4,"0"\)\}/);
  assert.match(app,/\{form\.manualType\} · \{serviceRef\} ↔ \{ticket\.ticket_number\}/);
  assert.match(app,/journalLink\.manual_type/);
});

test("closure remains independent of duplicate narrative fields", () => {
  assert.doesNotMatch(migration,/enforce_classroom_ticket_transition[\s\S]*field_journal_links/);
  assert.match(migration,/^  client_resolution text,$/m);
});
