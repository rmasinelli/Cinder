# AI Relay Smoke Test v3

This harmless documentation-only change exists to verify the corrected Claude ↔ Codex PR relay from the current `main` branch.

Expected behavior:

1. PR is marked as Codex-origin.
2. Claude reviews the change.
3. If Claude requests changes, Codex updates the same branch.
4. After approval, the PR is handed to Ryan for the final merge decision.
