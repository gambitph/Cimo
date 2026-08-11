# Cimo agent notes

## Product & architecture docs

| Kind | Where |
| --- | --- |
| Product overview | [`README.md`](./README.md) |
| Build / packaging | [`BUILD.md`](./BUILD.md) |
| Media upload notes | [`DEVELOPMENT.md`](./DEVELOPMENT.md) |
| E2E harness | [`e2e/readme.md`](./e2e/readme.md) |
| Release roadmap | [GitHub Project #12](https://github.com/orgs/gambitph/projects/12/views/1) |
| Free / premium repos | [`.cursor/rules/cimo-project-repos.mdc`](./.cursor/rules/cimo-project-repos.mdc) |

When code and docs disagree: **user-visible behaviour and WordPress.org constraints win**.
How-it-works notes under `DEVELOPMENT.md` and `src/admin/README.md` map current implementation.

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

Playwright for UI / e2e (`e2e/`, `@wordpress/env`).
Run with `npm test` (or `npm run test:debug` for the UI).
See [`e2e/readme.md`](./e2e/readme.md).
There is no PHPUnit suite today - prefer Playwright for regressions that matter to upload and settings flows.

## Free / premium

Agent workflow files (`AGENTS.md`, `.cursor/rules/`, `.cursor/skills/`) live in the **free** repo root so they apply to main plugin work and premium work checked out under `pro__premium_only/`.

- Premium feature code belongs only under `pro__premium_only/`.
- Gate-load with `CIMO_BUILD === 'premium'`.
- Free package must not include `pro__premium_only/` and must stay Plugin Check clean.
