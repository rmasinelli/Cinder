# AI PR Relay

Cinder uses a two-agent review protocol for pull requests authored by Claude or Codex.

## Author contract

An AI-authored pull request should be opened as a draft and carry exactly one origin label:

- `ai:origin-claude`
- `ai:origin-codex`

The relay chooses the opposite model as reviewer. If the reviewer requests changes, the origin model receives the review and edits the same PR branch. The relay allows at most three review rounds.

## States

- `ai:needs-review` — eligible for the relay.
- `ai:reviewing` — relay is currently evaluating it.
- `ai:changes-requested` — reviewer found blocking issues.
- `ai:approved` — independent AI reviewer found no blocking issues.
- `ai:merge-ready` — AI review completed; human merge decision is next.
- `ai:human-needed` — relay exhausted its review rounds or could not safely continue.

## Human boundary

The AI relay never merges a pull request. `ai:merge-ready` means the automated author/reviewer loop is complete and the PR should be handed to Ryan for the final merge decision.

## Secrets

The workflow expects repository Actions secrets named:

- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

Do not commit API keys or tokens to the repository.
