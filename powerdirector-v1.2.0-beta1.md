# PowerDirector parity upgrade brief

## Mission
Port the highest-value PowerDirector changes released after 2026-02-23 into PowerDirector. Prioritize core runtime parity only: security, config and secrets, delivery correctness, browser and gateway hardening, and operator tooling. Do not spend this pass on cosmetic UI work, branding cleanup, app packaging, or docs churn.


## Read first
- `AGENTS.md`
- `TASKS.md`

## Non-negotiable constraints
- PowerDirector source is the parity source of truth EXCEPT if it would break ANY existing working functionality or PowerDirector specific features and functionality. 
- Preserve all PowerDirector-specific behavior already called out in `TASKS.md`.
- Keep `powerdirector` and `pdir` naming in user-facing CLI, docs, config, and UI. Do not reintroduce `powerdirector` branding into PowerDirector surfaces.
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

## Clone and build the latest version of PowerDirector at ~/powerdirector-source and use that as a reference for this upgrade.

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
git remote add upstream https://github.com/powerdirector/powerdirector.git || true
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

## PowerDirector parity roadmap vs PowerDirector

Generated: 2026-03-10

### Scope

This roadmap is based on the PowerDirector release notes published after 2026-02-23.

I treated the cutoff like this:
- Included: `v2026.2.23` because it was published on 2026-02-24.
- Excluded: `v2026.2.22` because it was published on 2026-02-23.

Reviewed tags:
- Stable: `v2026.2.23`, `v2026.2.24`, `v2026.2.25`, `v2026.2.26`, `v2026.3.1`, `v2026.3.2`, `v2026.3.7`, `v2026.3.8`
- Beta tags reviewed for overlap and de-duplication: `v2026.2.24-beta.1`, `v2026.2.25-beta.1`, `v2026.3.2-beta.1`, `v2026.3.8-beta.1`

Important caveat: this is a release-note driven parity plan, not a commit-by-commit diff of your current PowerDirector branch. Use it as the upstream target list, then strike anything you already ported.

### Blunt summary

If your goal is to get PowerDirector somewhat close to upstream parity, do **not** start with UI polish, localization, or mobile packaging.

Start here instead:
1. Security and boundary hardening from `v2026.2.24` through `v2026.2.25`
2. Secrets, config validation, and runtime state correctness from `v2026.2.26` through `v2026.3.2`
3. Context-engine, browser/CDP, and gateway restart hardening from `v2026.3.7` through `v2026.3.8`

That is where the biggest parity gap and operational risk is.

---

### Highest-value parity targets

#### P0 - Must port first

These are the changes most likely to matter for correctness, safety, and day-2 operations.

- [ ] **Fail-closed cross-channel routing and session isolation**
  - Releases: `v2026.2.24`
  - Key refs: `#25864`, `#24571`
  - Why it matters: this closes the door on replies bleeding into the wrong channel or shared session.

- [ ] **Sandbox hardening: block Docker namespace joins by default**
  - Release: `v2026.2.24`
  - Key ref: sandbox `network: "container:<id>"` block-by-default change
  - Why it matters: this is a real boundary hardening change, not cosmetic cleanup.

- [ ] **Heartbeat delivery semantics and defaults**
  - Releases: `v2026.2.24`, `v2026.2.25`
  - Key refs: direct-chat blocking, `agents.defaults.heartbeat.directPolicy`, default flip back to `allow`
  - Why it matters: upstream changed this twice in back-to-back releases. If you port only half of it, your behavior will be wrong.

- [ ] **Port the large `v2026.2.25` security sweep as a single cluster**
  - Release: `v2026.2.25`
  - Key refs:
    - gateway pairing/auth hardening
    - direct-browser WebSocket origin checks and throttling
    - trusted-proxy `operator` role requirement
    - Teams file-consent origin binding
    - `agents.files` symlink escape blocking
    - workspace-only hardlink rejection
    - browser temp/upload path hardening
    - exact-argv and canonical-path exec approval hardening
    - reaction and interaction auth enforcement across multiple channels
    - IPv6 multicast SSRF blocking
  - Why it matters: this is not one bug fix. It is a major security tightening pass.

- [ ] **Config must fail closed**
  - Release: `v2026.3.7`
  - Key ref: `#9040`
  - Why it matters: upstream stopped silently running with permissive defaults after config load/validation failures.

- [ ] **`gateway.auth.mode` enforcement when both token and password exist**
  - Release: `v2026.3.7`
  - Key refs: gateway auth SecretRef support plus breaking auth-mode requirement
  - Why it matters: if you support both auth forms and do not port this, startup and pairing behavior will drift from upstream.

- [ ] **Browser SSRF redirect hardening**
  - Release: `v2026.3.8`
  - Key ref: private-network intermediate redirect blocking
  - Why it matters: this closes a subtle but important browser safety hole.

- [ ] **Bind approved script execution to on-disk snapshots**
  - Release: `v2026.3.8`
  - Key ref: approved `bun` and `deno run` operands bound to file snapshots
  - Why it matters: this prevents post-approval script swaps.

- [ ] **Gateway restart and invalid-config loop hardening**
  - Release: `v2026.3.8`
  - Key refs: `#40380`, `#38699`, `#20555`
  - Why it matters: this is core operator-grade stability work.

#### P1 - Very high value after P0

- [ ] **External Secrets Management CLI**
  - Release: `v2026.2.26`
  - Key ref: `#26155`
  - Implement: `secrets audit`, `configure`, `apply`, `reload`
  - Why it matters: upstream clearly moved toward a first-class secrets workflow.

- [ ] **Broad SecretRef coverage and normalization**
  - Releases: `v2026.2.23`, `v2026.3.2`, `v2026.3.7`, `v2026.3.8`
  - Key refs: SecretRef normalization for auth profiles, SecretRef coverage across 64 credential targets, SecretRef support for `gateway.auth.token`, config/runtime snapshot integrity after writes
  - Why it matters: you do not want half-integrated SecretRefs.

- [ ] **`powerdirector config validate` equivalent**
  - Release: `v2026.3.2`
  - Key ref: `#31220`
  - Why it matters: this pairs directly with the fail-closed config behavior.

- [ ] **Backup and restore safety tooling**
  - Release: `v2026.3.8`
  - Key ref: `#40163`
  - Implement: backup create/verify, config-only mode, workspace include/exclude options
  - Why it matters: this is one of the best operator-facing upgrades in the whole range.

- [ ] **Subagent delivery and announce state machine fixes**
  - Release: `v2026.2.25`
  - Key refs: `#26867`, `#25961`, `#26803`, `#25069`, `#26741`
  - Why it matters: subagent completion delivery is a core runtime path.

- [ ] **Queue, backoff, drain, and restart hardening**
  - Releases: `v2026.2.26`, `v2026.3.8`
  - Key refs: `#27710`, `#27407`, `#27332`, `#27427`, restart catch-up staggering
  - Why it matters: this directly affects cron, outbound delivery, and restart correctness.

- [ ] **Model fallback chain fixes**
  - Releases: `v2026.2.24`, `v2026.2.25`, `v2026.3.8`
  - Key refs: `#25922`, `#25912`, `#11972`, `#24137`, `#17231`, `#23816`, `#26106`, `#39377`
  - Why it matters: upstream put a lot of work into making fallback actually behave under cooldown, auth, allowlist, and quota pressure.

- [ ] **Routing scalability and same-channel recovery**
  - Releases: `v2026.2.25`, `v2026.3.7`
  - Key refs: `#26109`, `#36915`
  - Why it matters: this affects correctness first, performance second.

- [ ] **Session model-switch cache invalidation**
  - Release: `v2026.3.8`
  - Key ref: `#38044`
  - Why it matters: stale context-token accounting creates confusing behavior and bad model-window math.

- [ ] **ACP session history persistence and lineage**
  - Release: `v2026.3.8`
  - Key ref: `#40137`
  - Why it matters: this is a real parity gap if you use ACP heavily.

#### P2 - Major feature parity

- [ ] **First-class PDF tool**
  - Release: `v2026.3.2`
  - Key ref: `#31319`
  - Why it matters: this is a substantial end-user feature, not a small utility.

- [ ] **Diff tool stack**
  - Releases: `v2026.3.1`, `v2026.3.2`, `v2026.3.7`
  - Key refs: diffs plugin, diff artifact PDF output, prompt-loading cleanup
  - Why it matters: upstream clearly invested in code-diff workflows.

- [ ] **ContextEngine plugin system**
  - Releases: `v2026.3.7`, `v2026.3.8`
  - Key refs: `#22201`, `#40115`, `#40232`
  - Why it matters: do not port only the interface. Port the registry and bootstrap fixes too, or you will have a half-working feature.

- [ ] **Plugin runtime and SDK upgrades**
  - Release: `v2026.3.2`
  - Key refs:
    - `channelRuntime` exposure
    - `stt.transcribeAudioFile(...)`
    - `session_start` and `session_end` hook context upgrades
    - `message:transcribed`, `message:preprocessed`, richer `message:sent`
    - `runtime.system.requestHeartbeatNow(...)`
    - runtime event subscriptions
  - Why it matters: this is the plugin/platform extensibility wave.

- [ ] **Route-binding CLI**
  - Release: `v2026.2.26`
  - Key ref: `#27195`
  - Implement: `agents bindings`, `agents bind`, `agents unbind`
  - Why it matters: this is operationally important if you run multiple accounts/channels.

- [ ] **Health and readiness endpoints**
  - Release: `v2026.3.1`
  - Key ref: `#31272`
  - Why it matters: low effort, high ops value.

- [ ] **Backup CLI, Talk timeout, Brave LLM context, ACP provenance**
  - Release: `v2026.3.8`
  - Key refs: `#40163`, `#39607`, `#33383`, `#40473`
  - Why it matters: these are high-visibility parity features.

#### P3 - Important, but only if you actively use these surfaces

If PowerDirector is mostly a server/runtime fork for your use case, these can wait.

- Android app UX, startup, node capabilities, permissions, voice/TTS, Play-distribution cleanup
- macOS app/onboarding/overlay/restart/Tailscale packaging fixes
- iOS/App Store Connect packaging work
- Feishu deep feature set and routing fixes
- Mattermost picker work
- localized UI additions like Spanish and German

These are legitimate upstream changes, but they are not where I would spend my first parity cycles.

---

### Release-by-release distilled notes

#### `v2026.2.23` - groundwork release

Most important upgrades:
- Kilo provider support
- Kimi web search provider support
- Moonshot video provider support
- session cleanup and disk-budget controls
- per-agent `params` overrides merged over model defaults
- bootstrap snapshot caching per session

Most important fixes:
- browser SSRF policy migration/default change
- Telegram reasoning leak suppression
- failover on HTTP 502/503/504
- session-key canonicalization
- compaction safety and overflow handling improvements
- SecretRef/auth-profile normalization

My read: this was the start of a provider/search/cache/secrets cleanup phase.

#### `v2026.2.24` - routing and safety release

Most important upgrades:
- multilingual stop/abort shortcut handling
- trust-model heuristic for likely multi-user deployments

Most important fixes and behavior changes:
- fail-closed cross-channel reply routing
- heartbeat DM blocking and delivery semantics reset
- Docker sandbox namespace-join hardening
- model allowlist and fallback correctness
- proactive-send dedupe
- automation/subagent/cron delivery reliability
- Discord voice and block-stream delivery fixes
- WhatsApp reasoning suppression

My read: this is where upstream got much stricter about route correctness and background delivery behavior.

#### `v2026.2.25` - security sweep plus fallback reliability

Most important upgrades:
- `agents.defaults.heartbeat.directPolicy`

Most important fixes:
- huge security hardening batch across gateway auth, browser ingress, file boundaries, exec approvals, channel reactions/interactions, SSRF, and webhook authorization
- subagent announce delivery state machine
- Slack thread overflow guard via `session.parentForkMaxTokens`
- cron and multi-account routing fixes
- model fallback chain fixes across allowlists, cooldowns, and unknown-error traversal
- auth probe improvements

My read: if you skip this release, you are not close to upstream parity on security.

#### `v2026.2.26` - secrets and ops release

Most important upgrades:
- full external secrets workflow
- route-binding CLI for agents/accounts
- ACP thread-bound agents
- Codex WebSocket-first transport
- plugin-owned interactive onboarding

Most important fixes:
- DM allowlist inheritance correctness
- delivery queue retry fairness
- queue drain/restart hardening
- typing cleanup and TTL guardrails
- browser extension handshake/init/fill fixes
- compaction and onboarding safety fixes
- image-token blowup prevention

My read: this is the first release I would port right after the 2.24/2.25 security work.

#### `v2026.3.1` - runtime ops and transport release

Most important upgrades:
- built-in `/health`, `/healthz`, `/ready`, `/readyz`
- OpenAI Responses WebSocket-first transport
- Discord thread idle/max-age lifecycle controls
- Telegram DM topics and topic-aware routing
- diffs plugin
- cron light-context mode
- OpenAI WebSocket warm-up
- structured subagent runtime events

Most important fixes:
- cron delivery-mode-none behavior
- Slack announce target account routing
- Windows plugin install fix

My read: lots of good operator-quality work here, especially if you deploy behind orchestration or use OpenAI heavily.

#### `v2026.3.2` - SecretRef and plugin/platform extensibility release

Most important upgrades:
- SecretRef support across the credential surface
- first-class PDF tool
- `config validate`
- diff PDF output
- outbound adapter `sendPayload` support
- `sessions_spawn` attachments
- plugin SDK/runtime event and STT upgrades
- Ollama memory embeddings

Most important fixes:
- local TLS subagent pairing restore
- browser relay reconnect tolerance
- browser startup diagnostics and timeout honoring
- webhook ingress hardening
- voice-call lifecycle `EADDRINUSE` fixes
- Slack Bolt compatibility
- exec allowlist matching correctness

My read: this is a massive feature and platform-sdk release. Do not treat it like a minor point release.

#### `v2026.3.7` - context-engine and deployment release

Most important upgrades:
- ContextEngine plugin interface
- ACP persistent channel bindings
- Telegram ACP topic bindings and per-topic agent routing
- Perplexity Search API migration with filters
- onboarding web-search provider selection
- SecretRef for `gateway.auth.token`
- multi-stage slim Docker image
- prompt-injection policy for hooks
- compaction lifecycle events and post-compaction section config

Most important fixes:
- config must fail closed
- Slack duplicate-reply race dedupe
- chat streaming text preservation across tool boundaries
- route-binding lookup scalability
- browser session cleanup on session reset/delete
- cron file permission hardening
- plugin install rollback hardening

My read: port this together with `v2026.3.8`, not alone.

#### `v2026.3.8` - backup, browser, and restart hardening release

Most important upgrades:
- backup create/verify CLI
- Talk silence timeout config
- TUI active-agent inference from workspace
- Brave LLM-context search mode
- ACP provenance metadata and visible receipt injection
- GPT-5.4 Codex forward-compat limits

Most important fixes:
- Telegram DM dedupe and delivery correctness
- Matrix DM room handling
- config/runtime SecretRef snapshot integrity after writes
- browser relay bind-host support for WSL2 and similar setups
- CDP URL normalization and wildcard debugger URL rewriting
- Bedrock daily quota detection as `rate_limit`
- session `contextTokens` invalidation on model switch
- ACP child transcript/session-history persistence
- ContextEngine registry singleton and bootstrap fixes
- gateway restart timeout recovery and invalid-config restart guards
- cron restart catch-up staggering
- browser SSRF redirect blocking
- snapshot-bound approved script execution

My read: this is one of the highest-value parity releases in the whole window.

---

### What I would implement first if I owned the fork

#### Wave 1

Port these clusters first:
- `v2026.2.24` routing isolation and heartbeat behavior
- `v2026.2.25` security sweep
- `v2026.3.7` config fail-closed and auth-mode enforcement
- `v2026.3.8` SSRF, restart-guard, and script-snapshot hardening

#### Wave 2

Then port these operator and reliability upgrades:
- `v2026.2.26` external secrets CLI
- `v2026.3.2` SecretRef coverage and `config validate`
- `v2026.3.8` backup create/verify
- `v2026.2.25` and `v2026.2.26` queue, subagent, fallback, and routing reliability

#### Wave 3

Then port the platform/extensibility layer:
- `v2026.3.2` PDF tool and plugin runtime SDK changes
- `v2026.3.1` diffs plugin
- `v2026.3.2` diff PDF output
- `v2026.3.7` plus `v2026.3.8` ContextEngine stack

#### Wave 4

Finally, cherry-pick channel or app-specific work you actually use:
- Telegram topic/preview/reaction/polling work
- Discord thread/voice/proxy fixes
- Slack multi-account and allowlist fixes
- Feishu, Matrix, Mattermost, Android, macOS, iOS

---

### Parity traps you do not want to miss

- **Heartbeat behavior changed twice in two releases.** Port the full `2.24 -> 2.25` sequence or your defaults will be off.
- **ContextEngine is a two-release feature.** `v2026.3.7` adds the interface, but `v2026.3.8` fixes registry sharing and bootstrap timing. Port both.
- **SecretRef work is also multi-release.** The workflow lands in `v2026.2.26`, wide coverage lands in `v2026.3.2`, gateway auth support lands in `v2026.3.7`, and snapshot correctness lands in `v2026.3.8`.
- **Browser/gateway hardening is spread across several releases.** If you only take one or two fixes, you will still miss relay, CDP, SSRF, timeout, and restart stability work.
- **There is a lot of security work in `v2026.2.25` that looks unrelated at first glance.** It is worth porting as a cluster, not as isolated cherry-picks.

---

### What I would de-prioritize

Unless these surfaces are central to PowerDirector right now, I would not burn the first parity cycles on:
- localized UI changes
- Android onboarding polish and store compliance work
- macOS overlay and packaging refinements
- iOS App Store Connect prep
- docs-only updates
- branding-only cleanup
- minor CLI cosmetic changes like banner taglines

---

### Suggested implementation checklist for your IDE

#### Security and boundary hardening
- [ ] Port `v2026.2.24` routing/session isolation
- [ ] Port `v2026.2.24` sandbox namespace-join hardening
- [ ] Port `v2026.2.25` gateway/browser/file/exec/channel security series
- [ ] Port `v2026.3.7` config fail-closed behavior
- [ ] Port `v2026.3.7` explicit `gateway.auth.mode`
- [ ] Port `v2026.3.8` browser SSRF redirect blocking
- [ ] Port `v2026.3.8` script snapshot enforcement for approved `bun` and `deno run`
- [ ] Port `v2026.3.8` gateway restart/config loop guards

#### Secrets, config, and backups
- [ ] Port external secrets CLI from `v2026.2.26`
- [ ] Port SecretRef normalization from `v2026.2.23`
- [ ] Port wide SecretRef coverage from `v2026.3.2`
- [ ] Port gateway auth SecretRef support from `v2026.3.7`
- [ ] Port snapshot correctness after config writes from `v2026.3.8`
- [ ] Port config validation CLI from `v2026.3.2`
- [ ] Port backup create/verify from `v2026.3.8`

#### Reliability and runtime correctness
- [ ] Port heartbeat semantics cluster from `v2026.2.24` and `v2026.2.25`
- [ ] Port subagent announce delivery state machine from `v2026.2.25`
- [ ] Port queue backoff/drain fixes from `v2026.2.26`
- [ ] Port model fallback chain fixes from `v2026.2.24` and `v2026.2.25`
- [ ] Port Bedrock quota classification from `v2026.3.8`
- [ ] Port route-binding scalability from `v2026.3.7`
- [ ] Port session model-switch cache invalidation from `v2026.3.8`
- [ ] Port cron catch-up staggering from `v2026.3.8`

#### Browser, relay, and gateway ops
- [ ] Port health/readiness endpoints from `v2026.3.1`
- [ ] Port browser extension handshake/init/fill fixes from `v2026.2.26`
- [ ] Port browser relay reconnect tolerance and startup diagnostics from `v2026.3.2`
- [ ] Port `browser.relayBindHost` from `v2026.3.8`
- [ ] Port CDP URL normalization and wildcard URL rewriting from `v2026.3.8`
- [ ] Port browser session cleanup from `v2026.3.7`

#### Feature parity
- [ ] Port PDF tool from `v2026.3.2`
- [ ] Port diffs plugin from `v2026.3.1`
- [ ] Port diff PDF output from `v2026.3.2`
- [ ] Port ContextEngine stack from `v2026.3.7` and `v2026.3.8`
- [ ] Port route-binding CLI from `v2026.2.26`
- [ ] Port ACP provenance/history improvements from `v2026.3.8`
- [ ] Port Brave LLM-context mode from `v2026.3.8`

---

### Reference release URLs

- https://github.com/powerdirector/powerdirector/releases/tag/v2026.2.23
- https://github.com/powerdirector/powerdirector/releases/tag/v2026.2.24
- https://github.com/powerdirector/powerdirector/releases/tag/v2026.2.25
- https://github.com/powerdirector/powerdirector/releases/tag/v2026.2.26
- https://github.com/powerdirector/powerdirector/releases/tag/v2026.3.1
- https://github.com/powerdirector/powerdirector/releases/tag/v2026.3.2
- https://github.com/powerdirector/powerdirector/releases/tag/v2026.3.7
- https://github.com/powerdirector/powerdirector/releases/tag/v2026.3.8
