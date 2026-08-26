import assert from "node:assert/strict";
import test from "node:test";
import { IT111_SCENARIO_BANK, NETWORK_FINAL_SCENARIOS, NETWORK_SCENARIOS } from "../src/data/networkScenarioBank.js";
import { readFileSync } from "node:fs";

const app=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");

const purposes=["scope","timing_change","symptom_error","environment_equipment","prior_troubleshooting","impact_urgency"];

test("IT 111 provides one scenario for each of nine labs",()=>{
  assert.equal(NETWORK_SCENARIOS.length,9);
  assert.deepEqual(NETWORK_SCENARIOS.map(item=>item.week),[1,2,3,4,5,6,7,8,9]);
});

test("every networking lab has readiness, client, reset, branch, and print criteria",()=>{
  for(const item of IT111_SCENARIO_BANK){
    assert.equal(item.readiness.length,5,`${item.id} readiness count`);
    assert.ok(item.readiness.every(prompt=>prompt.length>=25),`${item.id} readiness prompts`);
    assert.ok(item.inquiryLimit>=2&&item.inquiryLimit<=3,`${item.id} inquiry limit`);
    assert.deepEqual(Object.keys(item.clientResponses).sort(),[...purposes].sort(),`${item.id} client purposes`);
    for(const marker of ["SETUP:","DIAGNOSTIC BRANCHES:","VERIFY:","RESET:","PRINTED SERVICE LOG:"]) assert.match(item.instructorNotes,new RegExp(marker),`${item.id} ${marker}`);
    assert.ok(item.knowledgeRefs.length>=2,`${item.id} knowledge references`);
  }
});

test("the assessed bank excludes VLAN and static-route configuration",()=>{
  for(const item of IT111_SCENARIO_BANK){
    const assessed=`${item.description}\n${item.instructorNotes}`;
    assert.doesNotMatch(assessed,/\b(?:vlan \d+|encapsulation dot1q|ip route \d)/i,item.id);
  }
});

test("team labs require individual console or cabling participation",()=>{
  const teamLabs=IT111_SCENARIO_BANK.filter(item=>item.mode==="teams");
  assert.ok(teamLabs.length>=7);
  for(const item of teamLabs) assert.match(item.instructorNotes,/Every student must|Every student|individual console\/cabling/i,item.id);
});

test("final variants are equivalent without being identical",()=>{
  assert.equal(NETWORK_FINAL_SCENARIOS.length,4);
  assert.equal(new Set(NETWORK_FINAL_SCENARIOS.map(item=>item.variantGroup)).size,1);
  assert.equal(new Set(NETWORK_FINAL_SCENARIOS.map(item=>item.description.match(/address block ([0-9./]+)/)?.[1])).size,4);
  for(const item of NETWORK_FINAL_SCENARIOS){
    assert.match(item.description,/Cable the pod and laptops/i);
    assert.match(item.description,/calculate and assign valid IPv4/i);
    assert.match(item.description,/router LAN interface/i);
    assert.match(item.description,/prove connectivity/i);
  }
});

test("the instructor scenario preview exposes readiness and Field Journal routing",()=>{
  assert.match(app,/Five readiness prompts/);
  assert.match(app,/Field Journal references/);
});
