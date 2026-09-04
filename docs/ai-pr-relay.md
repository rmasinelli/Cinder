# AI Pull Request Relay

Cinder uses an automated review-and-fix loop for pull requests authored by Claude or Codex. The model that did not author the pull request reviews it, and the originating model addresses any blocking findings on the existing pull request branch.

## Starting the relay

By convention, open the AI-authored pull request as a draft and apply exactly one origin label:

- `ai:origin-claude`
- `ai:origin-codex`

Apply `ai:needs-review` when the pull request is ready for independent review. The origin label must already be present when `ai:needs-review` is applied; adding the labels in the reverse order does not start the relay. The relay then selects the other model as reviewer.

## Review and fix loop

1. The reviewer inspects the complete diff against the pull request's base branch.
2. If there are blocking findings, the relay gives the review to the originating model.
3. The originating model edits and tests the same branch. For a Codex-origin pull request, the workflow commits and pushes the fixes. For a Claude-origin pull request, Claude commits and pushes the fixes and the workflow verifies and synchronizes them.
4. The independent reviewer checks the updated diff again.

The relay allows at most three review rounds. A successful review applies `ai:approved` and `ai:merge-ready`. If blocking findings remain after the third round, it applies `ai:human-needed`. Other failures stop the workflow without applying that label; check failed workflow runs as well as relay labels when monitoring pull requests.

The relay never merges a pull request. `ai:merge-ready` means that automated review is complete and a human must make the final merge decision.

## Reviewing unsafe code examples

Documentation is part of the review surface. Unsafe snippets must be clearly identified and paired with copyable safe code. For example, never evaluate a user-selected operation directly:

```js
// Unsafe: user input is executed as JavaScript.
const result = eval(userInput);
```

Use explicit allowlist dispatch instead:

```js
const OPERATIONS = Object.freeze({
  add: (left, right) => left + right,
  subtract: (left, right) => left - right,
});

const operation = typeof request.name === 'string' && Object.hasOwn(OPERATIONS, request.name)
  ? OPERATIONS[request.name]
  : undefined;
if (!operation) throw new Error('Unsupported operation');

const result = operation(request.left, request.right);
```

This selects code defined by the application and does not execute arbitrary input.

## Labels

| Label | Meaning |
|---|---|
| `ai:needs-review` | Ready for the relay |
| `ai:reviewing` | Review is in progress |
| `ai:approved` | The independent reviewer approved the changes |
| `ai:merge-ready` | Automated review is complete; human merge decision required |
| `ai:human-needed` | Automation stopped and needs human attention |

## Secrets

The relay uses the repository Actions secrets `CINDER_GITHUB_CLAUDE` and `CINDER_GITHUB_CODEX` for its Claude and Codex API credentials. Never commit API keys or tokens to the repository.
