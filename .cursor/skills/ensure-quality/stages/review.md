# Stage: review

Completion: every Standards, Spec, and anti-slop finding classified; `auto-fix` applied (≤2 rounds) or escalated; no unresolved `ask-user` left (or pipeline blocked).

## Three lenses

Review the pinned fixed point (three-dot committed diff + dirty worktree) on three lenses.
Prefer parallel sub-agents for Standards+anti-slop vs Spec so neither pollutes the other, then classify into findings (`r1`, `r2`, …) via `reference/findings.md`.

Paste into any sub-agent the full text it needs from this skill - sub-agents cannot see sibling files unless you include them.

### Standards + anti-slop

Sources (all of):

1. Standards / maintainability / anti-slop paths from discovery (project wins on conflict)
2. Full anti-slop baseline in `reference/anti-slop.md`
3. Full smell baseline in `reference/smells.md`

Report, per file/hunk where relevant:

- (a) every place the diff violates a documented project standard - cite source path + rule
- (b) every anti-slop baseline hit - name the check (e.g. "Ship or silence", "Catalogues stay derived") and quote the hunk
- (c) any Fowler smell from the baseline - name it and quote the hunk

Documented project rules and anti-slop **ship-or-silence / phantom / parallel-registry** hits can be hard violations.
Baseline smells and deep-module intuition are judgement calls.
Skip anything the lint stage will enforce.

### Spec

Locate the originating spec in this order:

1. Issue/PR references in commit messages - fetch if the environment allows
2. A path the user passed
3. Spec/PRD/ticket files under common docs locations matching the branch or feature
4. Else use **intent** as the spec source and say so

Report:

- (a) requirements missing or partial
- (b) behaviour in the diff that wasn't asked for (scope creep)
- (c) requirements that look implemented but wrong

Quote the spec/intent line for each finding.
Scope creep that is also speculative slop may appear on both lenses - emit one finding, note both lenses.

### Completion surfaces

If discovery found a checklist for this kind of change (ability/tool catalog, API surface, agent docs), run it against the diff before leaving review.
Missing checklist items → findings.

## Project hotspots

After discovery, prefer concrete findings over essay commentary wherever the project's own docs call out invariants (boundaries, catalogs, security, persistence, public APIs).
Do not invent hotspots the repo never stated - the anti-slop baseline already covers the generic patterns.

## Fix loop

Apply `auto-fix` review findings in this worktree.
Re-diff and re-review touched hunks (full lenses again only if the fix was broad).
Escalate leftovers and all `ask-user` items through the HITL pause in `SKILL.md`.
Deepening or removing a parallel registry is almost never silent auto-fix - use HITL.
