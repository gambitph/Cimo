# Findings taxonomy

Every stage emits zero or more findings.
Each finding has: `id` (stable in-run, e.g. `r1`, `t2`), `severity` (`error` | `warning` | `info`), `file` (path or `-`), `description`, and `action`.

## Actions

| Action | Meaning | Who decides |
| --- | --- | --- |
| `auto-fix` | Mechanical, low-risk; safe to fix without asking | Agent, within the 2-round cap |
| `ask-user` | Challenges stated intent, changes product behavior, or needs a judgement call | User via HITL pause |
| `no-op` | Informational; nothing to change | Nobody |

## Classification rules

Mark **`auto-fix`** when all of these hold:

- The fix is local and obvious (lint/format, unused import, clear standards breach with a one-line fix, stale doc line contradicted by this diff, tiny phantom-name removal or call-site swap onto an existing helper).
- It does not change user-visible product behavior beyond correcting a clear defect.
- It does not delete tests, widen/narrow public APIs, rewrite architecture, or "deepen" by large extract.

Mark **`ask-user`** when any of these hold:

- The finding disputes a deliberate choice captured in intent.
- The fix would change product behavior, UX copy, permissions, schemas, or public APIs.
- The fix is a speculative refactor, large rewrite, test deletion, or anti-slop deepen (extract shared helper, collapse parallel registry, re-derive catalogues).
- Severity is high and the right fix is ambiguous.

Anti-slop classification detail: `reference/anti-slop.md` (Classification hints).

Mark **`no-op`** for style notes already out of scope, compliments, or context the user should see but not act on.

When unsure between `auto-fix` and `ask-user`, choose **`ask-user`**.

## Severity hints

- `error` - must clear before `ready` (failing tests, blocking lint, broken contract, security footgun).
- `warning` - should clear; may become `ask-user` if the fix is judgmental.
- `info` - usually `no-op`.

Tooling failures (test red, linter red) are findings too - classify the *underlying* defect; the red command is evidence, not the taxonomy itself.
