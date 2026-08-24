const PREFIX = "cinder:draft:";

export function classroomDraftKey(studentId, ticketId) {
  return `${PREFIX}${studentId}:${ticketId}`;
}

export function loadClassroomDraft(storage, studentId, ticketId) {
  try {
    const raw = storage.getItem(classroomDraftKey(studentId, ticketId));
    if (!raw) return null;
    const draft = JSON.parse(raw);
    return typeof draft?.text === "string" ? draft : null;
  } catch {
    return null;
  }
}

export function saveClassroomDraft(storage, studentId, ticketId, draft) {
  storage.setItem(classroomDraftKey(studentId, ticketId), JSON.stringify(draft));
}

export function clearClassroomDraft(storage, studentId, ticketId) {
  storage.removeItem(classroomDraftKey(studentId, ticketId));
}

export function hasClassroomDraft(storage) {
  for (let index=0; index<storage.length; index+=1) {
    if (storage.key(index)?.startsWith(PREFIX)) return true;
  }
  return false;
}

export function appendUniqueNote(notes, note) {
  return notes.some(existing=>existing.id===note.id) ? notes : [...notes,note];
}
