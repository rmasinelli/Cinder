# Private scenario content operations

Instructor notes, staged-fault mappings, and scripted client replies are assessment keys. Cinder's repository is public, so none of that content may be committed to Git, embedded in migrations, placed in browser modules, or copied into student-facing documents.

## Secret pack location and format

Keep the working pack at `supabase/private/builtin-scenario-secrets.json`. The directory is git-ignored. Store the authoritative copy in the instructor-approved private records location and issue printed, sealed fault cards from that source.

The file is a JSON array. Each entry contains:

```json
{
  "scenario_id": "sc-course-term-item",
  "instructor_notes": "Instructor-only preparation, variant, verification, and reset directions.",
  "client_responses": {
    "scope": {"response": "Instructor-authored reply", "quality": "exact"},
    "timing_change": {"response": "Instructor-authored reply", "quality": "ambiguous"},
    "symptom_error": {"response": "Instructor-authored reply", "quality": "exact"},
    "environment_equipment": {"response": "Instructor-authored reply", "quality": "exact"},
    "prior_troubleshooting": {"response": "Instructor-authored reply", "quality": "mistaken"},
    "impact_urgency": {"response": "Instructor-authored reply", "quality": "exact"}
  }
}
```

Scenarios with an inquiry limit of zero may use an empty `client_responses` object. Inquiry-enabled scenarios require all six purposes and a valid quality: `exact`, `ambiguous`, `mistaken`, or `no_useful_information`.

## Load and rotate

1. Confirm the file is ignored with `git check-ignore supabase/private/builtin-scenario-secrets.json`.
2. Search the staged diff and build artifact for distinctive private phrases before every release.
3. Sign in as an instructor and call `load_builtin_scenario_secrets` with the parsed JSON and `p_replace=true`. The RPC validates every submitted entry before deleting the prior rows, so a malformed pack rolls back without partial replacement. It cannot know which scenario ids the term requires; verify the intended count before loading.
4. Confirm the returned count equals the intended scenario count and that the instructor Scenario Library shows the expected notes.
5. Push one non-assessment ticket, spend one inquiry with a test student, verify only the selected response is returned, then remove the test assignment using the approved classroom reset procedure.
6. Print/seal the physical variant cards and remove working copies from shared printers and student-accessible storage.

Never paste the pack into a GitHub issue, pull request, CI variable output, Cinder ticket, or public chat. Production loading is a separate deployment action; merging code does not authorize loading or rotating assessment content.

## Compromise response

Treat any committed, published, or student-visible key as retired. Create new fault-card mappings and materially new scripted replies in the private pack, load them atomically, destroy superseded printed cards, and record only the rotation date and scenario ids in the public change log. Old values already present in Git history must never be reused.
