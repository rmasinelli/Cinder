import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");

test("students have one assigned-ticket implementation",()=>{
  assert.match(app,/function MyTickets\(/);
  assert.doesNotMatch(app,/function MyLabs\(/);
  assert.doesNotMatch(app,/function FieldJournal\(/);
  assert.equal((app.match(/id:"my-tickets"/g)||[]).length,1);
});

test("the ticket detail teaches the triage-to-signoff lifecycle",()=>{
  for(const label of ["Triage","Work","Communicate","Verify","Signed off"])
    assert.match(app,new RegExp(`label:"${label}"`));
  assert.match(app,/Next required action/);
  assert.match(app,/Submit for instructor verification/);
  assert.match(app,/waiting for instructor sign-off/);
});

test("required actions and save truth remain visible",()=>{
  assert.match(app,/className="student-action-card"/);
  assert.match(app,/position:sticky/);
  assert.match(app,/role="status" aria-live="polite"/);
  assert.match(app,/Not saved/);
});

test("assigned tickets adapt to a narrow viewport",()=>{
  assert.match(app,/\.student-ticket-meta\{display:none!important;\}/);
  assert.match(app,/\.student-action-card\{position:static!important;\}/);
  assert.match(app,/gridTemplateColumns:"repeat\(5,minmax\(64px,1fr\)\)"/);
});
