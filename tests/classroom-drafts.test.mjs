import assert from "node:assert/strict";
import test from "node:test";
import {
  appendUniqueNote,
  clearClassroomDraft,
  classroomDraftKey,
  hasClassroomDraft,
  loadClassroomDraft,
  saveClassroomDraft,
} from "../src/lib/classroomDrafts.mjs";

function memoryStorage() {
  const values = new Map();
  return {
    get length(){ return values.size; },
    key: index=>[...values.keys()][index] ?? null,
    getItem: key=>values.get(key) ?? null,
    setItem: (key,value)=>values.set(key,value),
    removeItem: key=>values.delete(key),
  };
}

test("an unsent note survives a fresh client session until confirmed", () => {
  const storage = memoryStorage();
  const draft = {id:"draft-1",text:"Checked both DIMMs",updatedAt:"2026-08-24T18:00:00Z"};

  saveClassroomDraft(storage,"student-1","ticket-1",draft);
  assert.equal(hasClassroomDraft(storage),true);
  assert.deepEqual(loadClassroomDraft(storage,"student-1","ticket-1"),draft);
  assert.equal(classroomDraftKey("student-1","ticket-1"),"cinder:draft:student-1:ticket-1");

  clearClassroomDraft(storage,"student-1","ticket-1");
  assert.equal(hasClassroomDraft(storage),false);
  assert.equal(loadClassroomDraft(storage,"student-1","ticket-1"),null);
});

test("retrying the same draft cannot append a duplicate activity entry", () => {
  const note = {id:"draft-1",text:"Checked both DIMMs"};
  const once = appendUniqueNote([],note);
  const retried = appendUniqueNote(once,note);

  assert.equal(once.length,1);
  assert.equal(retried.length,1);
  assert.strictEqual(retried,once);
});

test("a corrupt device draft is ignored safely", () => {
  const storage = memoryStorage();
  storage.setItem(classroomDraftKey("student-1","ticket-1"),"not-json");
  assert.equal(loadClassroomDraft(storage,"student-1","ticket-1"),null);
});
