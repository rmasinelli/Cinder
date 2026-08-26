import assert from "node:assert/strict";
import test from "node:test";
import { PERSON_BY_ID } from "../src/data/people.js";
import { HARDWARE_ADVANCED_SCENARIOS, HARDWARE_FINAL_SCENARIOS, IT161_ADVANCED_BANK } from "../src/data/hardwareAdvancedBank.js";

const purposes=["scope","timing_change","symptom_error","environment_equipment","prior_troubleshooting","impact_urgency"];

test("IT 161 provides Labs 5 through 9 in order",()=>{
  assert.equal(HARDWARE_ADVANCED_SCENARIOS.length,5);
  assert.deepEqual(HARDWARE_ADVANCED_SCENARIOS.map(item=>item.week),[5,6,7,8,9]);
});

test("every advanced Hardware scenario is complete and maps to one printed log",()=>{
  for(const item of IT161_ADVANCED_BANK){
    assert.equal(item.readiness.length,5,`${item.id} readiness`);
    assert.deepEqual(Object.keys(item.clientResponses).sort(),[...purposes].sort(),`${item.id} client responses`);
    assert.ok(PERSON_BY_ID[item.requesterId],`${item.id} requester`);
    assert.ok(item.knowledgeRefs.length>=3,`${item.id} knowledge refs`);
    for(const marker of ["PREPARATION:","EQUIPMENT:","ROLES:","DIAGNOSTIC BRANCHES:","VERIFY:","RESET:","SIGN-OFF:","PRINTED SERVICE LOG:"]) assert.match(item.instructorNotes,new RegExp(marker),`${item.id} ${marker}`);
    assert.match(item.instructorNotes,/one printed|one individual log|PRINTED SERVICE LOG/i,item.id);
  }
});

test("Hardware scope excludes unsafe PSU and operating-system work",()=>{
  for(const item of IT161_ADVANCED_BANK){
    assert.match(item.instructorNotes,/Do not open a power supply/);
    assert.match(item.instructorNotes,/install an operating system/);
    assert.doesNotMatch(item.instructorNotes,/open the (?:PSU|power supply) (?:case|cover)/i);
  }
});

test("paired labs require hands-on work from both students",()=>{
  const paired=HARDWARE_ADVANCED_SCENARIOS.filter(item=>item.mode==="pairs");
  assert.deepEqual(paired.map(item=>item.week),[5,6,8]);
  for(const item of paired) assert.match(item.instructorNotes,/Both must|Each student/i,item.id);
});

test("the individual final supports twelve stations and two waves",()=>{
  assert.equal(HARDWARE_FINAL_SCENARIOS.length,4);
  for(const item of HARDWARE_FINAL_SCENARIOS){
    assert.equal(item.mode,"individual");
    assert.match(item.instructorNotes,/two waves of up to twelve/i);
    assert.match(item.instructorNotes,/three cold starts/i);
    assert.match(item.instructorNotes,/disassemble to labeled kit/i);
  }
});

test("final variants change the fault without disclosing it to the client",()=>{
  assert.equal(new Set(HARDWARE_FINAL_SCENARIOS.map(item=>item.instructorNotes.match(/stages variant [A-D]: ([^.]+)/)?.[1])).size,4);
  for(const item of HARDWARE_FINAL_SCENARIOS){
    assert.match(item.clientResponses.symptom_error.response,/does not currently reach the expected stable firmware screen/i);
    assert.doesNotMatch(item.clientResponses.symptom_error.response,/memory|CPU auxiliary|inactive output|storage power/i);
  }
});
