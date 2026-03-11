# PowerDirector parity upgrade brief

## Mission
Port the highest-value OpenClaw changes released after 2026-02-23 into PowerDirector. Prioritize core runtime parity only: security, config and secrets, delivery correctness, browser and gateway hardening, and operator tooling. Do not spend this pass on cosmetic UI work, branding cleanup, app packaging, or docs churn.


## Read first
- `AGENTS.md`
- `TASKS.md`

## Non-negotiable constraints
- OpenClaw source is the parity source of truth EXCEPT if it would break ANY existing working functionality or PowerDirector specific features and functionality. 
- Preserve all PowerDirector-specific behavior already called out in `TASKS.md`.
- Keep `powerdirector` and `pdir` naming in user-facing CLI, docs, config, and UI. Do not reintroduce `openclaw` branding into PowerDirector surfaces.
- Preserve the current PowerDirector port assignments and current PowerDirector defaults. Do not adopt upstream defaults blindly.
- Preserve the existing Chat Interface behavior.
- Preserve PowerDirector's strict configured fallback chain and the All Models Failed modal. Port upstream fallback correctness fixes without broadening fallback to unconfigured providers.
- Preserve Gemini CLI and Codex CLI runtime wiring.
- Preserve terminal runtime and UX, per-chat custom instructions, and the `metadata.powerdirector` / `powerdirector` manifest namespace.
- Preserve docs routes and existing PowerDirector UI extras unless a fix absolutely requires touching them.
- Do not do a broad merge from upstream. Use targeted cherry-picks or manual ports.
- Do not half-port multi-release features:
  - heartbeat behavior: `v2026.2.24` plus `v2026.2.25`
  - SecretRef and secrets stack: `v2026.2.26` plus `v2026.3.2` plus `v2026.3.7` plus `v2026.3.8`
  - ContextEngine: `v2026.3.7` plus `v2026.3.8`
- Skip mobile and desktop app work (`apps/**`, iOS, macOS, Android), localization, store packaging, docs-only churn, and branding-only churn unless a shared runtime or security fix depends on it.

## Clone and build the latest version of OpenClaw at ~/openclaw-source and use that as a reference for this upgrade.

## Repo areas to focus on
Primary targets:
- `src/**`
- `bin/**`
- `extensions/**`
- `ui/app/api/**`
- `ui/lib/**`

Files and areas to preserve carefully:
- `ui/app/components/ChatInterface.tsx`
- `src/providers/gemini-cli.ts`
- `src/providers/codex-cli.ts`
- `src/reliability/router.ts`
- `src/core/terminal.ts`
- `src/config/config-schema.ts`
- `src/plugins/manifest.ts`

Avoid first unless required by a shared-core fix:
- `apps/**`
- `docs/**`
- `assets/**`
- platform packaging and store files

## Working setup
```bash
git remote add upstream https://github.com/openclaw/openclaw.git || true
git fetch upstream --tags
git checkout -b parity/post-2026-02-23-core
pnpm install
pnpm build
pnpm test
pnpm -C ui build
```

If baseline build or tests already fail, stop and record the baseline failure before parity changes.

## Upstream tags to mine
- `v2026.2.23`
- `v2026.2.24`
- `v2026.2.25`
- `v2026.2.26`
- `v2026.3.1`
- `v2026.3.2`
- `v2026.3.7`
- `v2026.3.8`

Use focused diffs, not a blind merge. Start with release notes, then trace the exact upstream files and commits.

Useful commands:
```bash
git tag | grep '^v2026\.'
git log --oneline --reverse v2026.2.23..v2026.3.8 -- src bin extensions ui
git diff --stat v2026.2.23..v2026.3.8 -- src bin extensions ui
```

## Exact priority order

### 1) Security and boundary hardening
Port this cluster first.

From `v2026.2.24`:
- fail-closed cross-channel reply routing and session isolation
- Docker sandbox namespace-join hardening
- the first heartbeat direct-message behavior change

From `v2026.2.25`:
- port the security sweep as one cluster, not as random cherry-picks
- include gateway pairing and auth hardening
- include direct-browser WebSocket origin checks and throttling
- include trusted-proxy operator-role enforcement
- include Teams file-consent origin binding
- include `agents.files` symlink escape blocking and workspace-only hardlink boundary enforcement
- include browser temp and upload path hardening
- include exact-argv and canonical-path exec approval hardening
- include reaction and interaction auth enforcement across channels
- include IPv6 multicast SSRF blocking

From `v2026.3.7` and `v2026.3.8`:
- config must fail closed on load and validation errors
- enforce explicit `gateway.auth.mode` when both token and password exist
- browser SSRF redirect hardening
- bind approved `bun` and `deno run` execution to on-disk snapshots
- gateway restart timeout recovery and invalid-config restart-loop hardening

Do not move on until invalid config and auth edge cases fail loudly instead of silently falling back.

### 2) Secrets, config validation, and backup safety
Port this cluster second.

From `v2026.2.26`:
- external secrets workflow equivalent to `secrets audit`, `configure`, `apply`, and `reload`
- keep runtime snapshot activation and strict target-path validation behavior

From `v2026.3.2`:
- broad SecretRef coverage across the credential surface
- config validation CLI equivalent to `config validate` with machine-readable output

From `v2026.3.7`:
- SecretRef support for `gateway.auth.token`
- auth-mode guardrails

From `v2026.3.8`:
- preserve secrets-runtime-resolved config and auth-profile snapshots after config writes
- backup create and verify flow
- `--only-config`
- workspace include and exclude handling

Do not ship half-integrated SecretRefs. They must resolve, validate, persist, and survive config writes correctly.

### 3) Runtime correctness and delivery reliability
Port this cluster third.

From `v2026.2.24` and `v2026.2.25`:
- complete the heartbeat behavior sequence
- subagent completion announce queue, direct, and fallback state machine fixes
- proactive-send dedupe where required
- cron and multi-account routing correctness

From `v2026.2.26`:
- delivery queue retry fairness
- queue drain and restart hardening
- typing cleanup and TTL guardrails
- browser extension handshake, init, and fill fixes if they touch shared runtime behavior

From `v2026.2.24`, `v2026.2.25`, and `v2026.3.8`:
- model fallback correctness fixes under allowlists, cooldowns, auth failures, unknown errors, and quota pressure
- preserve PowerDirector's strict configured chain while importing the correctness fixes
- keep the All Models Failed UX intact

From `v2026.3.7` and `v2026.3.8`:
- route-binding lookup scalability
- stale `contextTokens` invalidation on session model switch
- ACP child transcript and session-history persistence and lineage
- cron restart catch-up staggering

### 4) Browser, gateway ops, and operator tooling
Port this cluster fourth.

From `v2026.3.1`:
- built-in `/health`, `/healthz`, `/ready`, and `/readyz`
- OpenAI Responses WebSocket-first transport only if it does not break PowerDirector provider customizations

From `v2026.3.2` and `v2026.3.8`:
- browser relay reconnect tolerance
- startup diagnostics and timeout honoring
- `browser.relayBindHost`
- CDP URL normalization and wildcard debugger URL rewriting
- browser session cleanup on session reset and delete

From `v2026.3.8`:
- backup create and verify if not already completed in step 2
- Bedrock daily quota classification as `rate_limit`

### 5) High-value feature parity after core stability is in place
Only start this after steps 1 through 4 are green.

Port in this order:
- first-class PDF tool from `v2026.3.2`
- diffs plugin from `v2026.3.1`
- diff PDF output from `v2026.3.2`
- ContextEngine plugin interface from `v2026.3.7` plus registry and bootstrap fixes from `v2026.3.8`
- route-binding CLI from `v2026.2.26`
- ACP provenance metadata and visible receipt injection from `v2026.3.8`
- Brave LLM-context web-search mode from `v2026.3.8`

Do not port ContextEngine alone. Port the interface and the follow-up fixes together.

## What not to do
- Do not touch theme, styling, layout identity, or PowerDirector branding except where a shared bug fix forces a tiny wiring change.
- Do not rewrite `ui/app/components/ChatInterface.tsx` to match upstream visuals.
- Do not remove or weaken PowerDirector-only provider behavior for Gemini CLI or Codex CLI.
- Do not convert PowerDirector back to upstream fallback semantics.
- Do not change current port assignments.
- Do not spend time on iOS, macOS, Android, App Store, Play Store, localization, or docs-only work.
- Do not ship a partial heartbeat port, partial SecretRef port, or partial ContextEngine port.
- Do not silently swallow config errors. Invalid config must stop startup.
- Do not batch unrelated cleanup into this branch.

## Minimum validation after each cluster
Run:
```bash
pnpm build
pnpm test
pnpm -C ui build
pdir --version
pdir status --json
```

Additional validations:
- after config work: verify invalid config fails startup and `pdir config validate` reports exact invalid paths
- after auth work: verify `gateway.auth.mode` conflict fails clearly
- after secrets work: verify SecretRef-backed values survive config writes and reloads
- after fallback work: verify the strict configured chain still holds and the All Models Failed modal still appears when all configured models fail
- after health endpoint work: verify `/healthz` and `/readyz`
- after backup work: create and verify both a full backup and a config-only backup
- after browser work: verify relay bind-host, CDP tab operations, and SSRF protections

## Commit strategy
- one commit per cluster
- mention the upstream tag or tags in each commit body
- keep commits reviewable and avoid mixing core runtime ports with unrelated UI cleanup

## Final handoff required
Leave a short owner handoff note with:
- what was ported
- what was intentionally skipped
- any breaking config migrations
- exact commands run for validation
- any unresolved risks or follow-up work