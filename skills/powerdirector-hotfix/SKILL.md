---
name: powerdirector-hotfix
description: Use this skill for same-version repairs (force-update the existing tag), not for new version bumps. Use when the user says to keep the same version and fix/force-update it, e.g. “Run the PowerDirector hotfix workflow for vX.Y.Z…”.
---

# PowerDirector Hotfix Workflow

This mirrors the `powerdirector-hotfix` skill. Use it for same-version repairs (force-update the existing tag), not for new version bumps.

## When to use
- User says to keep the same version and fix/force-update it, e.g. “Run the PowerDirector hotfix workflow for vX.Y.Z…”.
- Requests like “Fix X and force-update the same version”.

## Fixed environment
- Source repo: `~/powerdirector-source`
- Personal instance: `~/powerdirector`
- Test instance: `~/powerdirector-newusertest`
- Test ports: UI/gateway `4007`, terminal `4008`
- Personal instance ports must stay unchanged unless explicitly asked

## Non-negotiable rules
- Keep the same version unless the user explicitly wants a new one.
- Document all repo changes in `CHANGELOG.md` under the existing version entry.
- No personal data in the repo.
- Do not touch `~/powerdirector` unless explicitly asked to promote the fix there.
- Force-update the same GitHub tag/version after the fix is proven.
- Rebuild and validate in `~/powerdirector-newusertest` before considering the hotfix done.

## Workflow
1) Confirm target version and defect from the user.
2) Implement the fix in `~/powerdirector-source`.
3) Update `CHANGELOG.md` under the same version entry with hotfix details.
4) QA before pushing: inspect changed code, run targeted tests, run builds to catch integration failures.
5) Commit the fix in `~/powerdirector-source`.
6) Push to GitHub and force-update release state: push branch, align `main`/`master`, force-move tag `v<version>` to the repaired commit.
7) Refresh `~/powerdirector-newusertest` from GitHub, clean up ports, rebuild completely, and run on `4007/4008`.
   - **CRITICAL**: Kill any lingering processes on 4007 (`pkill -f "node ui/server.js" || true`, `pkill -f "dist/index.js" || true`).
   - **CRITICAL**: Run a full install (`npm ci` or `pnpm install`).
   - **CRITICAL**: Build BOTH the backend (`npm run build`) AND the frontend UI (`pnpm ui:build` or `cd ui && npm install && npm run build`). Missing the UI build will cause the gateway to fail to serve the web interface.
   - Start the gateway (`DB_PATH=./powerdirector.db TERMINAL_PORT=4008 ./setup-ports.sh && node dist/index.js gateway run --port 4007`).
8) Validate the repaired behavior with `agent-browser`.
9) Report: commit/tag, what was fixed, QA/build/tests run, UI verification, any caveats.

## Minimum QA expectation
- Test the broken flow that prompted the hotfix, then nearby regressions.
- Include if touched: chat/session flow, terminal, logs, config/setup, updates.

## Promotion rule
- Do not upgrade `~/powerdirector` as part of this workflow unless explicitly told to promote/upgrade `~/powerdirector` after the hotfix passes in `~/powerdirector-newusertest`.
