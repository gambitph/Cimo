# Documentation system: PRD / contract / how-it-works

## Status

Accepted

## Context

Cimo’s behaviour lives in a finished free tree plus a mounted premium tree.
Agents and humans need one place for product “should,” one place for must-guarantee module interfaces, and a place for implementation maps that cannot invent product law.
Ahentic’s ladder (PRD / contract / how-it-works / CONTEXT / ADR) fits; Cimo places free PRDs under free `docs/prd/` and premium-only PRDs under `pro__premium_only/docs/prd/`.

## Decision

We split docs as follows:

| Kind | Location | Wins when |
| --- | --- | --- |
| **Product PRD** | `docs/prd/*.md` (free) and `pro__premium_only/docs/prd/*.md` (premium-owned) | Code disagrees with intended product behaviour |
| **Subsystem contract** | Colocated `CONTRACT.md` at the deep-module ownership root | Code violates a must-guarantee interface |
| **How-it-works** | Colocated `*.md` next to code | Explaining current machinery (must not invent product law) |
| **Glossary** | Root [`CONTEXT.md`](../../CONTEXT.md) | Naming / ubiquitous language |
| **ADRs** | [`docs/adr/`](./) | Hard-to-reverse trade-offs |
| **Architecture map** | [`docs/architecture.md`](../architecture.md) | Finding the right subsystem |

Rules:

1. When code and docs disagree, **PRD and contract win**.
2. How-it-works must not invent new product law; treat gaps as bugs or open issues.
3. New narrative product docs outside this list are forbidden.
   Absorb into a PRD/contract, or do not write them.
4. Changing a deep-module **interface** requires updating the PRD/contract and tests in the same change.
5. Room-for-improvement refactors that deepen modules without changing product promises belong in GitHub issues, not as frozen “keep the mess” law.

## Consequences

- Agents load `docs/prd/README.md` (and premium index when touching premium) before changing behaviour.
- Free Directory packaging stays free of premium PRD ownership; premium docs travel with `pro__premium_only/`.
- Existing notes (`SAVING_ATTACHMENT_DATA.md`, `src/admin/README.md`) become how-it-works or are superseded by pointers into the ladder.
