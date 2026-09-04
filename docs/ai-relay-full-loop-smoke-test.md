# AI PR Relay Full-Loop Smoke Test

This documentation-only file intentionally contains a blocking security flaw so the AI PR Relay must exercise its requested-changes path.

## Unsafe example

The following example directly evaluates untrusted user input:

```python
result = eval(user_input)
```

This is intentionally unsafe for the smoke test. A correct reviewer should request changes and the originating agent should replace it with a safe alternative that does not execute arbitrary input.
