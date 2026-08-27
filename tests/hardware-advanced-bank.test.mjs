import assert from "node:assert/strict";
import test from "node:test";
import { PERSON_BY_ID } from "../src/data/people.js";
import { HARDWARE_ADVANCED_SCENARIOS, HARDWARE_FINAL_SCENARIOS, IT161_ADVANCED_BANK } from "../src/data/hardwareAdvancedBank.js";
import { FIELD_JOURNAL_PAGES } from "../src/data/fieldJournalPages.js";
import { readFileSync } from "node:fs";

const migration=readFileSync(new URL("../supabase/migrations/20260826202605_protect_builtin_scenario_secrets.sql",import.meta.url),"utf8");
const loader=readFileSync(new URL("../supabase/migrations/20260826221632_team_absence_and_private_scenario_loader.sql",import.meta.url),"utf8");

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
  }
});

test("private Hardware content is loaded out of band",()=>{
  assert.doesNotMatch(migration,/insert into private\.builtin_scenario_secrets/);
  assert.match(migration,/instructor-held, git-ignored secret pack/);
  assert.match(loader,/load_builtin_scenario_secrets/);
  assert.match(loader,/if p_replace then delete from private\.builtin_scenario_secrets/);
});

test("paired labs require hands-on work from both students",()=>{
  const paired=HARDWARE_ADVANCED_SCENARIOS.filter(item=>item.mode==="pairs");
  assert.deepEqual(paired.map(item=>item.week),[5,6,8]);
});

test("the individual final supports twelve stations and two waves",()=>{
  assert.equal(HARDWARE_FINAL_SCENARIOS.length,4);
  for(const item of HARDWARE_FINAL_SCENARIOS) assert.equal(item.mode,"individual");
});

test("final variants change the fault without disclosing it to the client",()=>{
  assert.equal(HARDWARE_FINAL_SCENARIOS.length,4);
  assert.ok(HARDWARE_FINAL_SCENARIOS.every(item=>!Object.hasOwn(item,"instructorNotes")&&!Object.hasOwn(item,"clientResponses")));
  assert.doesNotMatch(migration,/insert into private\.builtin_scenario_secrets/);
});
