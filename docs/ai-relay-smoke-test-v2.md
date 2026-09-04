# AI Relay Smoke Test v2

This documentation-only change verifies the current single-workflow Claude ↔ Codex PR relay.

Expected behavior:

1. PR is marked as Codex-origin.
2. Claude reviews the change.
3. If Claude requests changes, Codex updates this same branch.
4. After approval, the PR is handed to Ryan for the final merge decision.
