import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const migration=readFileSync(new URL("../supabase/migrations/20260826184555_linked_team_incidents.sql",import.meta.url),"utf8");
const attendanceMigration=readFileSync(new URL("../supabase/migrations/20260826221632_team_absence_and_private_scenario_loader.sql",import.meta.url),"utf8");

test("team assignments create named color-coded parent incidents and child tickets",()=>{
  assert.match(migration,/create table public\.team_incidents/);
  assert.match(migration,/team_incident_id uuid references public\.team_incidents/);
  assert.match(app,/team_name:teamKey\?`\$\{color\[0\]\} Team \$\{teamIndex\+1\}`/);
  assert.match(app,/color_name/);
  assert.match(app,/Students per team/);
});

test("an auditable absence does not block present teammates",()=>{
  assert.match(attendanceMigration,/set_team_member_excused/);
  assert.match(attendanceMigration,/excused_reason_required/);
  assert.match(attendanceMigration,/contribution\.excused_at is null/);
  assert.match(app,/Mark absent/);
  assert.match(app,/Restore/);
});

test("roles rotate and larger teams receive only the extra roles they need",()=>{
  for(const role of ["Client communication / lead","Hands-on technician","Evidence / documentation","Safety / equipment manager","Verification technician"]) assert.match(app,new RegExp(role.replaceAll("/","\\/")));
  assert.match(app,/\+week-1\)%roles\.length/);
});

test("individual contributions remain private and gate sign-off",()=>{
  assert.match(migration,/team contributions: own or admin read/);
  assert.match(migration,/team_contributions_incomplete/);
  assert.match(migration,/sibling\.status not in \('Verification','Closed'\)/);
  assert.match(app,/Record only what you personally contributed/);
  assert.match(app,/save_my_team_contribution/);
  assert.match(app,/save_my_team_shared_outcome/);
  assert.match(app,/key={`team-\$\{at\.id\}`}/);
  assert.match(app,/key={`client-\$\{at\.id\}`}/);
  assert.match(app,/if\(ticket\.team_incident_id\)supabase\.rpc\("team_roster"/);
  assert.match(app,/key={member\.student_id}/);
});

test("team identity is not conveyed by color alone",()=>{
  assert.match(app,/incident\.team_name/);
  assert.match(app,/incident\.color_name/);
  assert.match(app,/Team readiness/);
});
