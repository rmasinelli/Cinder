import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';
const require=createRequire(import.meta.url);
const {build}=require('esbuild');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const app=readFileSync(new URL('../src/App.jsx',import.meta.url),'utf8');
// Run the real student ticket component through JSX compilation; no browser or API writes.
const output=(await build({stdin:{contents:app+'\nexport {MyTickets};',resolveDir:new URL('../src',import.meta.url).pathname,loader:'jsx'},jsx:'automatic',bundle:true,platform:'node',format:'cjs',external:['react','react-dom','@supabase/supabase-js'],write:false,plugins:[{name:"offline-supabase",setup(builder){builder.onLoad({filter:/\/lib\/supabase\.js$/},()=>({contents:"export const supabase = {};",loader:"js"}));}}]})).outputFiles[0].text;
const module={exports:{}};new Function('require','module','exports',output)(require,module,module.exports);
function ticket(scenarioId,courseId){
 return renderToStaticMarkup(React.createElement(module.exports.MyTickets,{
  session:{id:'student',role:'student'},tickets:[],users:[],assignedTicketTotal:1,initialAssigned:'ticket',
  assignedTickets:[{id:'ticket',student_id:'student',scenario_id:scenarioId,course_id:courseId,week:2,title:'Existing issued title',description:'Original client request',status:'New',priority:'Low',_detailsLoaded:true}],
  builtinScenarios:[],readinessChecks:[],safetyAcknowledgments:[],
 }));
}
for(const [id,course,phrase] of [['sc-hw-02','hw','exact model'],['sc-net-f26-02','net','T568']]){
 test(`${id} shows actionable instructions before the evidence journal without replacing issued request`,()=>{
  const html=ticket(id,course);
  assert.match(html,/What to do/);assert.match(html,new RegExp(phrase));
  for(const heading of ['Goal','Equipment','Steps','Safety','Evidence','Completion','Reset']) assert.ok(html.includes(heading),heading);
  assert.ok(html.indexOf('What to do')<html.indexOf('Loading Field Journal link'));
  assert.ok(html.includes('Original client request'));assert.ok(html.includes('Existing issued title'));
  assert.match(html,/Student instructions v1/);assert.match(html,/addendum/i);
  assert.doesNotMatch(html,/INSTRUCTOR ONLY|answer key|known fault/i);
 });
}
test('unknown or mismatched scenario does not show another course instructions',()=>{
 assert.doesNotMatch(ticket('custom-unknown','hw'),/Student instructions v1/);
 assert.doesNotMatch(ticket('sc-net-f26-02','hw'),/Student instructions v1/);
});
