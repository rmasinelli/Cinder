# AI Relay Smoke Test

This file exists only to exercise the Claude ↔ Codex pull-request review relay with a harmless documentation-only change.

Expected behavior:

1. PR is marked as Codex-origin.
2. Claude reviews the change.
3. If Claude requests changes, Codex updates the same branch.
4. After approval, the PR is handed to Ryan for the final merge decision.
