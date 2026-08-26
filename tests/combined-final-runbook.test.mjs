import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const runbook=readFileSync(new URL("../docs/classroom/combined-final-runbook.md",import.meta.url),"utf8");
const offline=readFileSync(new URL("../docs/classroom/combined-final-offline-packet.md",import.meta.url),"utf8");

test("the runbook assigns all 24 students to bounded rotations",()=>{
  assert.match(runbook,/twelve numbered ESD build stations/);
  assert.match(runbook,/eight known-good laptops/);
  for(const team of Array.from({length:8},(_,i)=>`T${i+1}`)) assert.match(runbook,new RegExp(`\\| ${team} \\|`),team);
  for(const pod of ["P1","P2","P3","P4"]) assert.match(runbook,new RegExp(pod),pod);
  assert.match(runbook,/Block 1: IT 161 Hardware final \(130 minutes\)/);
  assert.match(runbook,/Block 2: IT 111 Networking and deployment final \(130 minutes\)/);
});

test("Hardware delay and service outages preserve Networking access and score ceiling",()=>{
  assert.match(runbook,/known-good laptop replaces an unavailable student-built PC immediately/i);
  assert.match(runbook,/FOG outage changes the proof path, not the student's score ceiling/i);
  assert.match(runbook,/do not consume Networking time repairing it/i);
  assert.match(runbook,/Cinder is unavailable/i);
  assert.match(runbook,/pod fails outside the staged variant/i);
});

test("every equivalent network variant proves the required technical outcomes",()=>{
  for(const variant of ["A","B","C","D"]) assert.match(runbook,new RegExp(`\\| ${variant} \\|`),variant);
  for(const proof of ["subnet calculation","endpoint-to-pod cabling","IPv4 settings","router LAN-interface","gateway and peer connectivity","staged fault"]) assert.match(runbook,new RegExp(proof,"i"),proof);
  assert.match(runbook,/VLANs and static routes are outside scope/);
});

test("scoring stays individual, split by course, and balanced 50\/50",()=>{
  assert.match(runbook,/Hardware and Networking are scored separately at 50 points each/);
  assert.match(runbook,/50\/50 technical versus professional-process balance/);
  assert.match(runbook,/FOG imaging contributes only within the five-point connectivity\/deployment row/);
  assert.match(runbook,/Team evidence may be shared, but every score is individual/);
});

test("the offline packet is printable and preserves the Cinder evidence chain",()=>{
  assert.equal((offline.match(/^\| \d+ \|/gm)||[]).length,24);
  for(const field of ["H ticket","N child ticket","Printed Service Log","client question","Personal console or cabling action","Next-technician handoff","Instructor initials/time"]) assert.match(offline,new RegExp(field,"i"),field);
  assert.match(offline,/student PC \+ FOG/);
  assert.match(offline,/laptop fallback/);
  assert.match(offline,/FOG outage proof/);
  assert.match(offline,/Combined total[^\n]*100/);
});
