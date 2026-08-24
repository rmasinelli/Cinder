# Printed Field Journal linkage

Cinder complements the printed Field Journal; it does not replace it. The
Hardware manual contains twelve pre-numbered Service Log pages (`TKT-0001`
through `TKT-0012`). Each page holds the detailed hypothesis and the repeated
Tool/Action, Why, and Observation entries.

For each assigned ticket, the student selects the manual type and Service Log
number in Cinder. Cinder displays the two-way reference together:

`Hardware · TKT-0001 ↔ HW-26F-0002`

The printed page identifies the Cinder record through the student's assigned
ticket and the stored mapping; the Cinder record identifies the exact manual
and pre-numbered Service Log page.

## Shared fields

The RLS-protected `field_journal_links` record contains only information useful
to service-desk triage, lab setup, escalation, verification, and communication:

- manual type and Service Log number;
- station and asset IDs;
- student team role;
- impact, urgency, and chosen priority;
- clarifying question and client response;
- escalation reason;
- verification checklist; and
- brief client-facing resolution.

The detailed troubleshooting log remains on paper. Closing a ticket does not
require students to copy that narrative into Cinder.

Students can read only their own link records and save them only through
`save_my_field_journal_link`. Instructors can read all mappings in the shared
Assignment Queue.
