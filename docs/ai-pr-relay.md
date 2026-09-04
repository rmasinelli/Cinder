# AI Pull Request Relay

Cinder uses an automated review-and-fix loop for pull requests authored by Claude or Codex. The model that did not author the pull request reviews it, and the originating model addresses any blocking findings on the existing pull request branch.

## Starting the relay

Open the AI-authored pull request as a draft and apply exactly one origin label:

- `ai:origin-claude`
- `ai:origin-codex`

Apply `ai:needs-review` when the pull request is ready for independent review. The relay then selects the other model as reviewer.

## Review and fix loop

1. The reviewer inspects the complete diff against the pull request's base branch.
2. If there are blocking findings, the relay gives the review to the originating model.
3. The originating model edits and tests the same branch; the workflow commits and pushes those fixes.
4. The independent reviewer checks the updated diff again.

The relay allows at most three review rounds. A successful review applies `ai:approved` and `ai:merge-ready`. If the relay exhausts its rounds or cannot continue safely, it applies `ai:human-needed`.

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

const operation = OPERATIONS[request.name];
if (!operation) throw new Error('Unsupported operation');

const result = operation(request.left, request.right);
```

This selects code defined by the application and does not execute arbitrary input.

## Labels

| Label | Meaning |
|---|---|
| `ai:needs-review` | Ready for the relay |
| `ai:reviewing` | Review is in progress |
| `ai:changes-requested` | The reviewer found blocking issues |
| `ai:approved` | The independent reviewer approved the changes |
| `ai:merge-ready` | Automated review is complete; human merge decision required |
| `ai:human-needed` | Automation stopped and needs human attention |

## Secrets

The relay uses repository Actions secrets for its Claude and Codex API credentials. Never commit API keys or tokens to the repository.
