import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {saveClassroomDraft,loadClassroomDraft} from '../src/lib/classroomDrafts.mjs';

const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
function harness(){
  const body=app.match(/const loadProfile = useCallback\(async \(userId\) => \{([\s\S]*?)\n  \}, \[\]\);/)[1];
  const state={view:'dashboard',selected:null,deep:null,session:null,resets:0,refreshes:0,onboarding:false};
  const data=new Map();
  const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
  const profileRequest={current:0},activeUserId={current:null};
  let pending=null;
  const supabase={from:()=>({select:()=>({eq:(_k,id)=>({single:()=>pending||Promise.resolve({data:{id,alias:id,role:'student',class_id:'class'}})})})}),rpc:async()=>{state.refreshes++;return {data:[{id:'class',course_id:'hw'}]};}};
  const setters={setSession:v=>{state.session=v;},setView:v=>{state.view=v;state.resets++;},setSelected:v=>{state.selected=v;},setDeepAssigned:v=>{state.deep=v;},setShowOnboarding:v=>{state.onboarding=v;},setClassStudents:()=>{},setAssignedTickets:()=>{},setAssignedTicketTotal:()=>{},setReadinessChecks:()=>{},setSafetyAcknowledgments:()=>{}};
  const env={supabase,localStorage:storage,profileRequest,activeUserId,...setters};
  const load=new Function(...Object.keys(env),`return async (userId)=>{${body}}`)(...Object.values(env));
  return {state,storage,load,profileRequest,activeUserId,defer(){let resolve;pending=new Promise(r=>{resolve=r;});return resolve;}};
}

test('same-account auth refresh preserves ticket view and draft while refreshing profile/classes',async()=>{
  const h=harness(); await h.load('student');
  h.state.view='my-tickets';h.state.selected='ticket';h.state.deep='ticket';
  saveClassroomDraft(h.storage,'student','ticket',{text:'unfinished evidence'});
  const resets=h.state.resets; await h.load('student');
  assert.equal(h.state.view,'my-tickets');assert.equal(h.state.selected,'ticket');assert.equal(h.state.deep,'ticket');
  assert.equal(h.state.resets,resets);assert.equal(h.state.refreshes,2);
  assert.equal(loadClassroomDraft(h.storage,'student','ticket').text,'unfinished evidence');
});

test('account switch resets navigation and selected ticket',async()=>{
  const h=harness();await h.load('one');h.state.view='my-tickets';h.state.selected='private-one';h.state.deep='private-one';
  await h.load('two'); assert.equal(h.state.view,'dashboard');assert.equal(h.state.selected,null);assert.equal(h.state.deep,null);assert.equal(h.state.session.id,'two');
});

test('a signed-out or superseded profile request cannot restore an old session',async()=>{
  const h=harness();const resolve=h.defer();const load=h.load('one');
  h.profileRequest.current++;h.activeUserId.current=null;h.state.session=null;
  resolve({data:{id:'one',alias:'one',role:'student'}});await load;assert.equal(h.state.session,null);
});
