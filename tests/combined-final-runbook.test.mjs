import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const runbook=readFileSync(new URL("../docs/classroom/combined-final-runbook.md",import.meta.url),"utf8");
const offline=readFileSync(new URL("../docs/classroom/combined-final-offline-packet.md",import.meta.url),"utf8");

function section(start,end){return runbook.slice(runbook.indexOf(start),runbook.indexOf(end));}
function scoreRows(text){return [...text.matchAll(/^\| (Technical|Process):[^|]+\| (\d+) \|$/gm)].map(match=>({kind:match[1],points:Number(match[2])}));}

test("the runbook assigns all 24 students to bounded rotations",()=>{
  assert.match(runbook,/twelve numbered ESD build stations/);
  assert.match(runbook,/eight known-good laptops/);
  for(const team of Array.from({length:8},(_,i)=>`T${i+1}`)) assert.match(runbook,new RegExp(`\\| ${team} \\|`),team);
  for(const pod of ["P1","P2","P3","P4"]) assert.match(runbook,new RegExp(pod),pod);
  assert.match(runbook,/Block 1: IT 161 Hardware final \(130 minutes\)/);
  assert.match(runbook,/Block 2: IT 111 Networking and deployment final \(130 minutes\)/);
});

test("rotation matrix uses eight teams, four pods twice, and no repeated pod variant",()=>{
  const rows=[...runbook.matchAll(/^\| (T\d) \| (P\d) \/ ([AB]) \|[^|]+\| (L\d) \| ([A-D]) \|$/gm)]
    .map(match=>({team:match[1],pod:match[2],rotation:match[3],laptop:match[4],variant:match[5]}));
  assert.equal(rows.length,8);
  assert.equal(new Set(rows.map(row=>row.team)).size,8);
  assert.equal(new Set(rows.map(row=>row.laptop)).size,8);
  for(const pod of ["P1","P2","P3","P4"]){
    const assigned=rows.filter(row=>row.pod===pod);
    assert.deepEqual(assigned.map(row=>row.rotation).sort(),["A","B"]);
    assert.equal(new Set(assigned.map(row=>row.variant)).size,2,`${pod} repeats a variant`);
  }
  for(const variant of ["A","B","C","D"]) assert.equal(rows.filter(row=>row.variant===variant).length,2,variant);
});

test("both timelines close at 130 minutes with symmetric hands-on windows",()=>{
  const hardware=section("## Block 1","## Block 2");
  const network=section("## Block 2","### Required proof");
  const ranges=text=>[...text.matchAll(/^\| (\d+)-(\d+) \|/gm)].map(match=>[Number(match[1]),Number(match[2])]);
  assert.equal(Math.max(...ranges(hardware).map(([,end])=>end)),130);
  assert.equal(Math.max(...ranges(network).map(([,end])=>end)),130);
  assert.deepEqual(ranges(hardware).filter(([start])=>start===10||start===70).map(([start,end])=>end-start),[50,50]);
  assert.deepEqual(ranges(network).filter(([start])=>start===15||start===65).map(([start,end])=>end-start),[40,40]);
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
  const hardware=scoreRows(section("| IT 161 Hardware |","| IT 111 Networking |"));
  const networking=scoreRows(section("| IT 111 Networking |","## Instructor closeout"));
  for(const rows of [hardware,networking]){
    assert.equal(rows.reduce((sum,row)=>sum+row.points,0),50);
    assert.equal(rows.filter(row=>row.kind==="Technical").reduce((sum,row)=>sum+row.points,0),25);
    assert.equal(rows.filter(row=>row.kind==="Process").reduce((sum,row)=>sum+row.points,0),25);
  }
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
