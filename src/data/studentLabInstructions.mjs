// Student-facing addenda. Do not import private instructor notes or diagnostic answers.
// Version each published revision; existing ticket descriptions and evidence stay intact.
const LAB_2 = {
  'sc-hw-02': {
    courseId: 'hw', version: 1, published: '2026-10-01',
    goal: 'Identify bench components and choose compatible connections using exact model specifications.',
    equipment: ['Assigned bench devices or board with exact model identifiers', 'Instructor-provided cables and adapters', 'Manufacturer documentation and your printed Service Log'],
    steps: ['Identify the relevant ports and connectors on the assigned devices.', 'Record the exact model and consult its manufacturer specifications for one uncertain capability.', 'Select a supported connection and verify it using the instructor-approved setup.', 'Document one connection that looks plausible but is incompatible; explain the capability mismatch.', 'Each student records their own identification, research, and verification evidence.'],
    safety: ['Follow the bench ESD and power-isolation instructions before handling components.', 'Stop and ask the instructor if a connector, cable, or port is damaged or if safe operation is uncertain.', 'Do not force a connector or assume that matching shape proves compatibility.'],
    evidence: ['Printed Service Log: connector identification, exact source/model citation, selected connection, incompatibility explanation, and observed verification result.', 'Cinder: link your station/assets and Service Log 2, record your own role and concise progress, then provide the client-facing result.'],
    completion: ['Verify the supported connection and explain your evidence to the instructor.', 'Save your evidence, check it is saved, and submit for instructor verification.', 'The instructor checks the printed entry and supplies signoff; submitting does not mean approved.'],
    reset: ['Return cables, adapters, devices, and documentation cards to their labeled baseline positions.'],
  },
  'sc-net-f26-02': {
    courseId: 'net', version: 1, published: '2026-10-01',
    goal: 'Terminate and test two Ethernet patch cables, diagnose a failed result, and hand over only cables that pass.',
    equipment: ['Instructor-provided cable materials and approved termination tools', 'Cable tester, tester leads, and a known-good reference cable', 'Assigned fault exercise and your printed Service Log'],
    steps: ['Record the T568 wiring standard you will use and identify each cable.', 'Terminate or reterminate at least one end yourself using the approved tool procedure.', 'Personally run a tester cycle and record the observed wire map or failed result.', 'Explain the observed defect before correcting it, then retest end-to-end.', 'Each student records their own actions and results, even when sharing the bench.'],
    safety: ['Use only the instructor-approved tools and safe termination procedure.', 'Stop and report damaged connectors or tools before continuing.', 'This lab does not authorize or assess VLAN or static-route configuration.'],
    evidence: ['Printed Service Log: standard used, cable identifier, tool/action/reason/observation entries, and initial and final tester results.', 'Cinder: link your station/assets and Service Log 2, record your own role and concise progress, then provide the client-facing result.'],
    completion: ['Verify that the wire map passes end-to-end and explain the failed result and correction.', 'Save your evidence, check it is saved, and submit for instructor verification.', 'The instructor checks the printed entry and supplies signoff; submitting does not mean approved.'],
    reset: ['Dispose of scrap ends safely, count tools, and return tester leads and the known-good cable separately.'],
  },
};

export function studentLabInstructions(ticket) {
  const instructions = LAB_2[ticket?.scenario_id];
  return instructions?.courseId === ticket?.course_id ? instructions : null;
}
