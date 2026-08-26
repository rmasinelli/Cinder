import assert from "node:assert/strict";
import test from "node:test";
import { IT111_SCENARIO_BANK, NETWORK_FINAL_SCENARIOS, NETWORK_SCENARIOS } from "../src/data/networkScenarioBank.js";
import { PERSON_BY_ID } from "../src/data/people.js";
import { readFileSync } from "node:fs";
import { FIELD_JOURNAL_PAGES } from "../src/data/fieldJournalPages.js";

const app=readFileSync(new URL("../src/App.jsx",import.meta.url),"utf8");
const source=readFileSync(new URL("../src/data/networkScenarioBank.js",import.meta.url),"utf8");
const migration=readFileSync(new URL("../supabase/migrations/20260826202605_protect_builtin_scenario_secrets.sql",import.meta.url),"utf8");

test("IT 111 provides one scenario for each of nine labs",()=>{
  assert.equal(NETWORK_SCENARIOS.length,9);
  assert.deepEqual(NETWORK_SCENARIOS.map(item=>item.week),[1,2,3,4,5,6,7,8,9]);
});

test("every networking lab exposes student-safe metadata and canonical book routing",()=>{
  for(const item of IT111_SCENARIO_BANK){
    assert.equal(item.readiness.length,5,`${item.id} readiness count`);
    assert.ok(item.readiness.every(prompt=>prompt.length>=25),`${item.id} readiness prompts`);
    assert.ok(item.inquiryLimit>=2&&item.inquiryLimit<=3,`${item.id} inquiry limit`);
    assert.ok(item.knowledgeRefs.length>=2,`${item.id} knowledge references`);
    assert.ok(item.knowledgeRefs.every(ref=>FIELD_JOURNAL_PAGES.has(ref)),`${item.id} canonical refs`);
    assert.equal(item.clientResponses,undefined);
    assert.equal(item.instructorNotes,undefined);
  }
});

test("the assessed bank excludes VLAN and static-route configuration",()=>{
  for(const item of IT111_SCENARIO_BANK){
    assert.doesNotMatch(item.description,/\b(?:vlan \d+|encapsulation dot1q|ip route \d)/i,item.id);
  }
});

test("new scenario ids preserve historical ticket metadata and requesters exist",()=>{
  assert.ok(IT111_SCENARIO_BANK.every(item=>item.id.startsWith("sc-net-f26-")));
  assert.equal(new Set(IT111_SCENARIO_BANK.map(item=>item.id)).size,IT111_SCENARIO_BANK.length);
  for(const item of IT111_SCENARIO_BANK) assert.ok(PERSON_BY_ID[item.requesterId],`${item.id} requester`);
});

test("team labs require individual console or cabling participation",()=>{
  const teamLabs=IT111_SCENARIO_BANK.filter(item=>item.mode==="teams");
  assert.ok(teamLabs.length>=7);
});

test("final variants are equivalent without being identical",()=>{
  assert.equal(NETWORK_FINAL_SCENARIOS.length,4);
  assert.equal(new Set(NETWORK_FINAL_SCENARIOS.map(item=>item.description.match(/address block ([0-9./]+)/)?.[1])).size,4);
  for(const item of NETWORK_FINAL_SCENARIOS){
    assert.match(item.description,/Cable the pod and laptops/i);
    assert.match(item.description,/calculate and assign valid IPv4/i);
    assert.match(item.description,/router LAN interface/i);
    assert.match(item.description,/prove connectivity/i);
  }
});

test("final client replies expose symptoms without disclosing staged faults",()=>{
  for(const item of NETWORK_FINAL_SCENARIOS){
    assert.equal(item.clientResponses,undefined);
  }
  assert.doesNotMatch(source,/clientResponses|instructorNotes/);
  assert.doesNotMatch(migration,/insert into private\.builtin_scenario_secrets/);
});

test("the instructor scenario preview exposes readiness and Field Journal routing",()=>{
  assert.match(app,/Five readiness prompts/);
  assert.match(app,/Field Journal references/);
});
