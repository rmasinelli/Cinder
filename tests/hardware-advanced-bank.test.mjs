import assert from "node:assert/strict";
import test from "node:test";
import { PERSON_BY_ID } from "../src/data/people.js";
import { HARDWARE_ADVANCED_SCENARIOS, HARDWARE_FINAL_SCENARIOS, IT161_ADVANCED_BANK } from "../src/data/hardwareAdvancedBank.js";
import { FIELD_JOURNAL_PAGES } from "../src/data/fieldJournalPages.js";
import { readFileSync } from "node:fs";

const migration=readFileSync(new URL("../supabase/migrations/20260826202605_protect_builtin_scenario_secrets.sql",import.meta.url),"utf8");

test("IT 161 provides Labs 5 through 9 in order",()=>{
  assert.equal(HARDWARE_ADVANCED_SCENARIOS.length,5);
  assert.deepEqual(HARDWARE_ADVANCED_SCENARIOS.map(item=>item.week),[5,6,7,8,9]);
});

test("every advanced Hardware scenario exposes only student-safe metadata",()=>{
  for(const item of IT161_ADVANCED_BANK){
    assert.equal(item.readiness.length,5,`${item.id} readiness`);
    assert.ok(PERSON_BY_ID[item.requesterId],`${item.id} requester`);
    assert.ok(item.knowledgeRefs.length>=3,`${item.id} knowledge refs`);
    assert.ok(item.knowledgeRefs.every(ref=>FIELD_JOURNAL_PAGES.has(ref)),`${item.id} canonical refs`);
    assert.equal(item.clientResponses,undefined);
    assert.equal(item.instructorNotes,undefined);
    assert.match(migration,new RegExp(`'${item.id}'`),`${item.id} private seed`);
  }
});

test("private Hardware notes preserve scope and assessment criteria",()=>{
  assert.match(migration,/Do not open a power supply/);
  assert.match(migration,/install an operating system/);
  for(const marker of ["PREPARATION:","EQUIPMENT:","ROLES:","DIAGNOSTIC BRANCHES:","VERIFY:","RESET:","SIGN-OFF:","PRINTED SERVICE LOG:"]) assert.match(migration,new RegExp(marker));
});

test("paired labs require hands-on work from both students",()=>{
  const paired=HARDWARE_ADVANCED_SCENARIOS.filter(item=>item.mode==="pairs");
  assert.deepEqual(paired.map(item=>item.week),[5,6,8]);
  assert.match(migration,/Both must inspect\/connect and verify/);
});

test("the individual final supports twelve stations and two waves",()=>{
  assert.equal(HARDWARE_FINAL_SCENARIOS.length,4);
  for(const item of HARDWARE_FINAL_SCENARIOS) assert.equal(item.mode,"individual");
  assert.match(migration,/two waves of up to twelve/i);
  assert.match(migration,/three cold starts/i);
  assert.match(migration,/disassemble to labeled kit/i);
});

test("final variants change the fault without disclosing it to the client",()=>{
  assert.equal(HARDWARE_FINAL_SCENARIOS.length,4);
  assert.doesNotMatch(readFileSync(new URL("../src/data/hardwareAdvancedBank.js",import.meta.url),"utf8"),/memory module not fully|CPU auxiliary power disconnected|inactive output after|storage power disconnected/i);
  assert.match(migration,/does not currently reach the expected stable firmware screen/i);
});
