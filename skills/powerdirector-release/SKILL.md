---
name: powerdirector-release
description: Use this skill for new-version releases (not same-version hotfixes). Use when the user asks for a new version with features/fixes, e.g. “Run the PowerDirector release workflow for vX.Y.Z…”.
---

# PowerDirector Release Workflow

This mirrors the `powerdirector-release` skill used in Codex. Use it for new-version releases (not same-version hotfixes).

## When to use
- User asks for a new version with features/fixes, e.g. “Run the PowerDirector release workflow for vX.Y.Z…”.
- Requests that imply a version bump, not a same-version repair.

## Fixed environment
- Source repo: `~/powerdirector-source`
- Personal instance: `~/powerdirector`
- Test instance: `~/powerdirector-newusertest`
- Test ports: UI/gateway `4007`, terminal `4008`
- Personal instance ports must stay unchanged unless the user explicitly asks

## Non-negotiable rules
- Document all repo changes in `CHANGELOG.md`.
- No personal data in the repo.
- Do not touch `~/powerdirector` unless the user explicitly says to promote it.
- New-version releases bump version metadata everywhere it is surfaced.
- Push to GitHub and align branch/tag state.
- After pushing, rebuild and validate in `~/powerdirector-newusertest`.
- Use `agent-browser` to confirm the relevant UI behavior works.

## Workflow
1) Confirm requested version and scope from the user.
2) Implement changes in `~/powerdirector-source`.
3) Update version strings for the release.
4) Update `CHANGELOG.md` under the requested version.
5) QA before pushing: inspect changed code, run targeted tests, run builds to catch integration failures.
6) Commit in `~/powerdirector-source`.
7) Push to GitHub; align `main`/`master`; create or move tag `v<version>` to the shipped commit.
8) Refresh `~/powerdirector-newusertest` from GitHub, clean up ports, rebuild completely, and run on `4007/4008`.
   - **CRITICAL**: Kill any lingering processes on 4007 (`pkill -f "node ui/server.js" || true`, `pkill -f "dist/index.js" || true`).
   - **CRITICAL**: Run a full install (`npm ci` or `pnpm install`).
   - **CRITICAL**: Build BOTH the backend (`npm run build`) AND the frontend UI (`pnpm ui:build` or `cd ui && npm install && npm run build`). Missing the UI build will cause the gateway to fail to serve the web interface.
   - Start the gateway (`DB_PATH=./powerdirector.db TERMINAL_PORT=4008 ./setup-ports.sh && node dist/index.js gateway run --port 4007`).
9) Validate with `agent-browser`.
10) Report: commit/tag, what changed, QA/build/tests run, UI verification, any caveats.

## Minimum QA expectation
- Test changed feature plus nearby regressions.
- Always include if touched: chat/session send + follow-up, terminal connect + simple command, logs page load, config/setup save and no forced rerun, update UI load/version state.

## Promotion rule
- Do not upgrade `~/powerdirector` as part of this workflow unless explicitly told to promote the personal instance after test validation.
