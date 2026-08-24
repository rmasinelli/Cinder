# Shared classroom data contract

Cinder's launch UI treats Supabase as the authority for every classroom record
that students or instructors can see.

## Launch-visible shared data

| Workflow | Supabase source |
|---|---|
| Class enrollment and aliases | `classes`, `profiles`, `profile_classes` |
| Lab scenarios | built-in versioned scenarios plus shared `ticket_templates` |
| Pushed lab work | `lab_assignments`, `assigned_tickets` |
| Student status changes | `update_my_assigned_ticket_status` RPC |
| Ticket identity and lifecycle audit | `assigned_tickets.ticket_number`, `ticket_status_history` |
| Graded lab documentation | `lab_notes` through `save_my_lab_note` |
| Instructor assignment queue | RLS-protected `assigned_tickets` reads |
| Knowledge base | `knowledge_articles`, `knowledge_article_revisions` |

Assignment and lab-note changes are published through Supabase Realtime. The
application also refreshes assignments when a browser regains focus, so a
temporary Realtime interruption cannot leave a returning classroom session
permanently stale.

## Browser storage

Browser storage is limited to device preferences that are safe to lose:

- `cinder:onboarded:<profile-id>` records whether that browser dismissed the
  onboarding tour.
- `cinder:codes` remembers class codes on that device to simplify sign-in.

Clearing browser storage cannot remove tickets, statuses, lab notes, class
membership, scenarios, or knowledge articles.

## Deferred demo workflows

The old generic ticket queue, ticket submission form, inbox notifications, and
incident-response demo used browser-local seed records. They are intentionally
absent from launch navigation until later issues replace them with an audited
shared schema and workflow. They must not be reintroduced to launch navigation
without a Supabase data source, RLS policy, and cross-session test.
