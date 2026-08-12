# Cimo agent notes

## Product & architecture docs

| Kind | Where |
| --- | --- |
| Glossary | [`CONTEXT.md`](./CONTEXT.md) |
| Product PRDs (should) | [`docs/prd/README.md`](./docs/prd/README.md) |
| Premium PRDs (should) | [`pro__premium_only/docs/prd/README.md`](./pro__premium_only/docs/prd/README.md) |
| Subsystem contracts | Colocated `CONTRACT.md` (see PRD index) |
| Architecture map | [`docs/architecture.md`](./docs/architecture.md) |
| ADRs | [`docs/adr/`](./docs/adr/) |
| Build / packaging | [`BUILD.md`](./BUILD.md) |
| E2E harness | [`e2e/readme.md`](./e2e/readme.md) |
| Release roadmap | [GitHub Project #12](https://github.com/orgs/gambitph/projects/12/views/1) |
| Free / premium repos | [`.cursor/rules/cimo-project-repos.mdc`](./.cursor/rules/cimo-project-repos.mdc) |

When code and docs disagree: **PRD/contract win** (WordPress.org / Plugin Check constraints still apply to free packaging).
How-it-works maps (colocated `*.md`, plus older notes like `DEVELOPMENT.md` / `src/admin/README.md`) describe current machinery only - they must not invent product law.

Changing a deep-module **interface** requires updating the PRD/contract and tests in the same change.

## General guidelines

- Never use the em dash "—". Use plain dash "-" instead, but if applicable, just use a comma.
- When writing commit messages, NEVER auto-add your agent name as co-author.
- Never manually modify CHANGELOG.md files or any files that are marked as auto-generated.
- When writing or substantially editing long Markdown files, put each full sentence on its own line.
  Preserve normal Markdown structure, but avoid wrapping multiple sentences onto one physical line.
- When making technical decisions, do not give much weight to development cost.
  Instead, prefer quality, simplicity, robustness, scalability, and long term maintainability.
- When doing bug fixes, always start with reproducing the bug in an E2E setting as closely aligned with how an end user would experience it as possible.
  This makes sure you find the real problem so your fix will actually solve it.
- When end-to-end testing a product, be picky about the UI you see and be obsessed with pixel perfection.
  If something clearly looks off, even if it is not directly related to what you are doing, try to get it fixed along the way.
- Apply that same high standard to engineering excellence: lint, test failures, and test flakiness.
  If you see one, even if it is not caused by what you are working on right now, still get it fixed.

## Coding standards (agents)

Maintainability / anti-slop (deepen seams, no phantom settings or freemium leaks): [`.cursor/rules/cimo-anti-slop.mdc`](./.cursor/rules/cimo-anti-slop.mdc) - always-on Cursor rule.

JavaScript / React surfaces (plain `.js`, settings React vs media-manager vanilla JS): [`.cursor/rules/cimo-javascript-react.mdc`](./.cursor/rules/cimo-javascript-react.mdc).

WordPress.org / Plugin Check for free builds: [`.cursor/rules/cimo-wordpress-plugin-check.mdc`](./.cursor/rules/cimo-wordpress-plugin-check.mdc).

## Agent skills

Project skills live under [`.cursor/skills/`](./.cursor/skills/). Prefer the WordPress plugin, directory-guidelines, REST, and performance skills for Cimo work.
React composition / best-practice skills apply mainly to `src/admin/js/page/` and related admin UI.

### Issue tracker

GitHub Issues on this repo (`gambitph/Cimo`) via the `gh` CLI.
Roadmap / version targeting: [org project #12](https://github.com/orgs/gambitph/projects/12/views/1).

### Testing

Playwright for UI / e2e (`e2e/`, `@wp-playground/cli` — no Docker).
Run free with `npm run test:e2e` after `npm run build:e2e`.
With `pro__premium_only/` mounted, run premium with `npm run test:e2e:premium` after `npm run build:e2e:premium`.
See [`e2e/readme.md`](./e2e/readme.md).
Free-repo CI runs the free suite only.
Premium-repo CI runs free then premium.
There is no PHPUnit suite today - prefer Playwright for regressions that matter to upload and settings flows.

### Quality gate

Local review (incl. anti-slop) → test → document → lint before commit / after substantive or AI-generated changes.
Skill: `.cursor/skills/ensure-quality/` (project-agnostic; loads this repo's anti-slop rules via discovery).

## Free / premium

Agent workflow files (`AGENTS.md`, `.cursor/rules/`, `.cursor/skills/`) live in the **free** repo root so they apply to main plugin work and premium work checked out under `pro__premium_only/`.

- Premium feature code belongs only under `pro__premium_only/`.
- Gate-load with `CIMO_BUILD === 'premium'`.
- Free package must not include `pro__premium_only/` and must stay Plugin Check clean.
