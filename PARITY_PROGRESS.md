# PowerDirector ↔ PowerDirector Parity Progress

Status tracker by wave/sprint with beta-version increments per wave (beta.1 is current). Each item has two checkboxes:

- `Done` – implemented in source
- `QA` – validated in **~/powerdirector-newusertest** with agent-browser + targeted tests

## How to use this with PowerDirector upstream
- Upstream mirror: **~/powerdirector-source** (remote `upstream` = https://github.com/powerdirector/powerdirector.git).
- Refresh refs before each wave: `cd ~/powerdirector-source && git fetch upstream --tags`.
- Inspect the tagged release noted per item (e.g., `v2026.3.8`): `git checkout v2026.3.8` and diff against PowerDirector: `git diff v2026.3.8 -- <path>` or cross-repo compare using `git difftool --dir-diff` with `~/powerdirector-source`.
- When an item is implemented in PowerDirector, tick `Done`; after agent-browser QA in **~/powerdirector-newusertest** with personal config copied and ports 4007/4008, tick `QA`.
- Bump the beta version one step per wave (e.g., beta.2, beta.3) and keep the tag pointing at the wave head commit.
- Keep changes clustered by wave in commits named `waveN: <short scope>` and update `CHANGELOG.md` under the corresponding beta version.

## Wave 1 – target **1.2.0-beta.2** (Security & Routing Core)
- [x] Done [ ] QA  Fail-closed cross-channel routing/session isolation (`v2026.2.24`)
- [x] Done [x] QA  Sandbox: block Docker `network: container:<id>` joins (`v2026.2.24`)
- [x] Done [ ] QA  Heartbeat delivery semantics reset (sequence `v2026.2.24` → `v2026.2.25`)
- [x] Done [ ] QA  Port full `v2026.2.25` security sweep (covered by cross-channel routing fix + existing beta.1 items)
- [x] Done [x] QA  Config must fail closed on load/validation errors (`v2026.3.7`)
- [x] Done [x] QA  `gateway.auth.mode` required when token+password present (`v2026.3.7`)
- [x] Done [x] QA  Browser SSRF redirect-chain hardening (Playwright/CDP, remote tab guard) (`v2026.3.8`)
- [x] Done [x] QA  Gateway restart/invalid-config loop guards (`v2026.3.8`)
- [x] Done [ ] QA  Bind approved `bun`/`deno run` to on-disk snapshots (`v2026.3.8`)

## Wave 2 – target **1.2.0-beta.3** (Secrets, Config Validate, Backup, Reliability)
- [x] Done [x] QA  External Secrets CLI (`secrets audit/configure/apply/reload`) (`v2026.2.26`)
- [x] Done [x] QA  SecretRef normalization & wide coverage (`v2026.2.23`/`v2026.3.2`/`v2026.3.7`/`v2026.3.8`)
- [x] Done [x] QA  `config validate` CLI (`v2026.3.2`)
- [x] Done [x] QA  Backup create/verify, config-only mode, include/exclude (`v2026.3.8`)
- [x] Done [x] QA  Subagent announce/delivery state machine fixes (`v2026.2.25`)
- [x] Done [x] QA  Queue/backoff/drain/restart hardening (`v2026.2.26` + `v2026.3.8`)
- [x] Done [x] QA  Model fallback chain fixes (`v2026.2.24`/`v2026.2.25`/`v2026.3.8`)
- [x] Done [x] QA  Route-binding scalability and same-channel recovery (`v2026.2.25`/`v2026.3.7`)
- [x] Done [x] QA  Session model-switch cache invalidation (`v2026.3.8`)
- [x] Done [x] QA  Cron restart catch-up staggering (`v2026.3.8`)
- [x] Done [x] QA  Bedrock quota classification as rate_limit (`v2026.3.8`)

## Wave 3 – target **1.2.1-beta.1** (Platform & Browser Ops)
- [x] Done [x] QA  Health/readiness endpoints `/health|/healthz|/ready|/readyz` (`v2026.3.1`)
- [x] Done [x] QA  Browser extension handshake/init/fill fixes (`v2026.2.26`)
- [x] Done [x] QA  Browser relay reconnect tolerance & startup diagnostics (`v2026.3.2`)
- [x] Done [x] QA  `browser.relayBindHost` (`v2026.3.8`)
- [x] Done [x] QA  CDP URL normalization & wildcard debugger rewrite (`v2026.3.8`)
- [x] Done [x] QA  Browser session cleanup on session reset/delete (`v2026.3.7`)

## Wave 4 – target **1.2.0-beta.5** (Feature Parity)
- [ ] Done [ ] QA  First-class PDF tool (`v2026.3.2`)
- [ ] Done [ ] QA  Diffs plugin (`v2026.3.1`) & diff PDF output (`v2026.3.2`)
- [ ] Done [ ] QA  ContextEngine stack (interface `v2026.3.7` + registry/bootstrap fixes `v2026.3.8`)
- [ ] Done [ ] QA  Route-binding CLI (`agents bindings/bind/unbind`) (`v2026.2.26`)
- [ ] Done [ ] QA  ACP provenance/history improvements (`v2026.3.8`)
- [ ] Done [ ] QA  Brave LLM-context search mode (`v2026.3.8`)

## Notes
- Current shipped version: **1.2.0-beta.2** (Wave 1 complete).
- Checkboxes reflect current source and QA status; update per wave as items land and are verified in the test instance.
