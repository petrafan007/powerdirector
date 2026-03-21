# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0-beta.3] - 2026-03-18

### Added
- **[Wave 2] External Secrets CLI** (`v2026.2.26`): New `secrets` sub-command group (`audit`, `configure`, `apply`, `reload`) for managing encrypted secrets and runtime secret resolution. Documentation added to `docs/cli/secrets.md`.
- **[Wave 2] Config Validate CLI** (`v2026.3.2`): Added `config validate` command to perform deep schema and integrity validation of the active configuration without starting the gateway.
- **[Wave 2] Backup System** (`v2026.3.8`): New `backup` sub-command group (`create`, `verify`) with support for `--dry-run`, config-only mode, and inclusion/exclusion of workspaces and sessions.

### Changed / Fixed
- **[Hotfix 17] Chat UI Message Ordering**: Resolved issue where optimistic user messages sent during concurrent generation events would get stuck below the agent's replies until historical synchronization.
- **[Hotfix 17] Context Baseline Pinning**: Fixed `SessionManager` auto-compaction to explicitly insert the new session summary securely into chronological history bounds, preventing it from resting at the absolute bottom of the chat interface.
- **[Hotfix 17] Mercury-2 Token Exhaustion**: Fixed `429 Input token limit exceeded` failures in fallback routing specifically targeting `inception/mercury-2`. The agent and context pruner now dynamically negotiate safe `maxTokens` (8192) limits per request to prevent context window overflow when fallback engines rely on restrictive contexts.
- **[Hotfix 17] Gateway Boot Crash**: Resolved a TypeError (`homedir is not a function`) that prevented the PowerDirector gateway from initializing in some test and remote environments due to malformed path route config signatures.
- **[Wave 2] SecretRef Normalization & Runtime Isolation** (`v2026.3.8`): The gateway now operates on a "secrets runtime snapshot" that is activated at startup and can be hot-reloaded. Required secret references in config now fail-closed at startup if unresolved.
- **[Wave 2] Subagent State Machine & Dispatch Fixes** (`v2026.2.25`): Hardened the internal gateway dispatch for plugin-spawned subagents. Added `setFallbackGatewayContext` to support subagent operations from non-WebSocket paths (e.g., Telegram polling, WhatsApp).
- **[Wave 2] Reliability & Hardening** (`v2026.3.8`):
    - **Model Fallbacks**: Fixed edge cases in the fallback chain where certain provider errors didn't trigger a switch.
    - **Cron Staggering**: Added restart catch-up staggering to prevent a thundering herd of cron jobs when the gateway starts after downtime.
    - **Bedrock Classification**: AWS Bedrock `too-many-tokens-per-day` errors are now correctly classified as `rate_limit` to trigger appropriate backoff/fallback behavior.
- **[Wave 2] Secure Config Includes**: `src/config/includes.ts` now uses boundary-checked file reads with a 2MB limit to prevent SSRF or directory traversal via `$include` directives.

## [1.2.0-beta.2] - 2026-03-18

### Changed / Fixed
- **[Wave 1] Fail-closed cross-channel routing — session isolation** (`v2026.2.24 + v2026.2.25`): Agent replies are now pinned to the turn-source channel (`turnSourceChannel`) provided at the start of each agent turn. This prevents a race where a concurrent inbound message on a different channel (in `dmScope = "main"` shared sessions) updates `lastChannel` while the agent turn is in flight and causes the reply to be sent to the wrong channel. The fix is fail-closed: when a turn-source channel is set, _no_ fallback to mutable session metadata occurs. Applied across `targets.ts`, `agent-delivery.ts`, and the gateway `agent` handler. 4 focused test cases added.
- **[Wave 1] Heartbeat delivery semantics reset** (`v2026.2.25`): Default heartbeat target changed from `"last"` to `"none"`. Users without an explicit `heartbeat.target` in their config will no longer receive unsolicited heartbeat messages; this matches the upstream fail-safe default. Exec-completion and cron-event prompts now carry a `deliverToUser` flag (`buildExecEventPrompt`, updated `buildCronEventPrompt`) so the model is instructed to process silently when there is no active delivery channel.
- **[Wave 1] Bun/Deno `run` approval binding to on-disk snapshots** (`v2026.3.8`): New `src/node-host/invoke-system-run-plan.ts` provides specialised argv scanners for `bun` and `deno run` that locate the mutable script file operand past subcommands and option flags. This enables exec-approval snapshot hardening for these runtimes in the same way already supported for POSIX shell scripts and node interpreters. 29 unit tests added.
- **[Wave 1] Full `v2026.2.25` security sweep** — the remaining sub-items (gateway auth/pairing, browser WS origins+throttle, SSRF edges) were landed in `1.2.0-beta.1`; the cross-channel routing fix above covers the last open item from this sweep. Marked complete.

## [1.2.0-beta.1] - 2026-03-17

### Added
- Parity roadmap brief (`powerdirector-v1.2.0-beta1.md`) that enumerates P0/P1/P2 targets from PowerDirector releases (v2026.2.23–v2026.3.8) with release-by-release notes and an implementation checklist for this cycle.

### Changed
- Bumped gateway and UI package versions to `1.2.0-beta.1`.
- Config loader now fails closed: any validation/load error halts startup; when both a gateway token and password are present, `gateway.auth.mode` is mandatory and enforced before boot. Implemented via `validateConfigObjectRaw` in `config-manager`.
- Sandbox security tightened: Docker sandbox requests using `network: container:<id>` are blocked by default (host mode was already blocked) with unit coverage in `validate-sandbox-security.test.ts`.
- Gateway/UI network interface probing hardened to avoid `uv_interface_addresses` crashes on restricted hosts, unblocking UI build of `/api/instances`.
- Agent workspace file boundaries hardened: `agents.files.get/set` now reject symlinks, hardlinks, and any path that resolves outside the workspace; links are treated as missing in listings and guarded by new unit tests.
- SSRF guardrails: IPv6 multicast targets (`ff00::/8`) are now blocked by the private-address classifier to prevent redirect-based SSRF.
- Browser navigation SSRF hardening now validates redirect chains and final navigation targets in Playwright flows (`createPageViaPlaywright`, `navigateViaPlaywright`) and blocks remote CDP tab-open fallback when strict SSRF policy requires redirect-hop inspection.
- Daemon lifecycle hardening: `gateway start`/`gateway restart` now run config-validation preflight checks and fail fast with explicit invalid-path errors instead of attempting a restart with a broken config.
- Gateway run-loop hardening: post-restart startup failures are now caught without killing the process, and the gateway lock is released on failed restart attempts so daemon restart/stop can recover cleanly.
- Release/hotfix workflows tightened: skills now require copying the personal `~/powerdirector/powerdirector.config.json` into the test instance, pinning test ports to gateway/UI `4007` and terminal `4008`, and running release/hotfix-focused QA via agent-browser (minimum 3 default-model exchanges, chat render verification, zero errors, and validation that shipped fixes are observable in behavior/UI).

## [1.1.0-beta.3] - 2026-03-15

### Fixed
- **[Hotfix 16] Resolved Gateway Startup Crash**: Fixed a critical regression introduced in Hotfix 13 where `DiscoveryManager` (`src/core/discovery.ts`) incorrectly called a non-existent `getConfigManager().get()` method, causing a `TypeError` that crashed the gateway on startup. Added a backward-compatible `get()` alias to `ConfigManager` to fix this.
- **[Hotfix 16] Resolved Agent "PLAN mode" Lock**: Changed the `google-gemini-cli` provider's default `--approval-mode` from `plan` (read-only) to `auto_edit`. This ensures agents remain functional even if they fall back to default provider settings after a configuration mishap.
- **[Hotfix 16] Hardened Config Preservation**: Modified `update-runner.ts` to explicitly exclude `powerdirector.config.json` from the `git checkout --` reset step during updates. This prevents git from overwriting user configuration files with repository templates.
- **[Hotfix 15] Context Loss Prevention**: Fixed a critical bug in `ContextPruner.enforceTokenBudget` (`src/context/pruner.ts`) where recent user follow-up questions could be blindly evicted from the context window when a session accumulated large tool outputs (e.g., Frigate camera event listings). The pruner now protects the last 2 real user messages from being shifted out, preferring to evict tool results and older messages first.
- **[Hotfix 15] Message Ordering Fix (Backend)**: Guaranteed the final assistant message timestamp is always strictly greater than `runStartTime` in `agent.ts` by using `Math.max(Date.now(), runStartTime + 1)`. This prevents the assistant response from appearing before the user message in the UI during same-millisecond timestamp collisions.
- **[Hotfix 15] Message Ordering Fix (UI)**: Added explicit sort-by-timestamp-then-sequence to the `fetchHistory` merge logic in `ChatInterface.tsx`. After merging DB messages with local optimistic messages, the resulting array is now sorted by `(timestamp ASC, sequence ASC)` to match the DB sort order and eliminate 1-2 render cycle ordering glitches.
- **[Hotfix 15] Fixed Update Blocked by Dirty Lockfile**: Added `pnpm-lock.yaml` and `package-lock.json` to the git dirty-check exclusion list in `update-git-runtime-files.ts`. These lockfiles are regenerated on every local `pnpm/npm install` and are not meaningful code changes, so they no longer block the "Install Now" update flow.
- **[Hotfix 15] Prevent Config Wipe on Update (Critical)**: `powerdirector.config.json` was tracked in the git repository, causing `git checkout --detach <tag>` during an update to overwrite the user's personal config with the template/example version from the tag. Fixed by (a) running `git rm --cached powerdirector.config.json` to remove it from the git index, (b) adding `powerdirector.config.json` to `.gitignore` so it can never be accidentally committed again, and (c) patching `update-runner.ts` to restore preserved runtime files **before** AND after the `powerdirector doctor --fix` step — previously the restore only ran inside `finalizeGitResult` (after doctor), so doctor ran against the template config and could further overwrite user settings.
- **[Hotfix 15] Config Hardening**:
    - Added emergency safeguard: `doctor` now aborts if the config is missing during an update, preventing accidental initialization of a default template.
    - Added config integrity check in update runner to verify restoration success.
- **[Hotfix 14] Image Rendering & Web Search**: Expanded UI regex support for `MEDIA:` and `Image found:` patterns to seamlessly render images inside chat bubbles. Enhanced the Web Search tool to output direct image URLs from DuckDuckGo Instant Answers.
- **[Hotfix 14] NANO BANANA Generator**: Restored functionality to the `nano-banana-pro` skill by introducing a dedicated `run.sh` entrypoint, fixing path resolution to properly execute the internal `image.py` script, and upgrading the configured Google GenAI model to the available `imagen-4.0-generate-001`.
- **[Hotfix 14] Resolved UI Crash**: Fixed a critical circular dependency between `agent-instance.ts` and `registry/tools.ts` that caused `PowerDirectorService` to be undefined during API requests.
- **[Hotfix 14] Robust Root Resolution**: Implemented explicit search paths for the project root in both `ui/lib/paths.ts` and `src/config/paths.ts` to ensure consistent configuration loading across varied environments (standard vs. QA test directories).
- **[Hotfix 14] Personal Instance Recovery**: Successfully recovered the personal instance UI by nuking orphaned gateway processes and rebuilding the Next.js server with the latest Hotfix 13/14 fixes.
- **[Hotfix 14] Untrack Personal Config**: Removed `powerdirector.config.json` from the git index to prevent local configuration overwrites and "dirty tree" errors during the automated update process.
- **[Hotfix 14] Database Path Persistence**: Updated the UI `PowerDirectorService` to respect the `config.database.path` setting, ensuring chat history survives refreshes and restarts when using custom data directories.
- **[Hotfix 13] Improved LLM Reliability**: Fixed a critical bug where Gemini CLI could return 0-character responses, causing the agent to stall. The system now treats empty chunks as failures and supports up to 2 automatic retries in `src/core/agent.ts` and `src/reliability/router.ts`.
- **[Hotfix 13] Fixed Provider Discovery**: Resolved an issue where local providers like Ollama were not appearing in the UI. Updated `src/config/zod-schema.core.ts` to allow `baseURL` and ensured `ui/app/api/providers/route.ts` always renders fallback models (`gpt-oss:120b-cloud`) if local discovery fails.
- **[Hotfix 13] SkillsManager Initialization**: Fixed "SkillsManager not initialized" errors by ensuring the manager is ready before tool registration in `ui/lib/agent-instance.ts` and `ui/lib/registry/tools.ts`.
- **[Hotfix 13] Unified Config Resolution**: Standardized configuration lookup to prioritize `powerdirector.config.json` in the project root, preventing the setup wizard from re-triggering due to path mismatches between the CLI and UI.
- **[Hotfix 13] Robust UI Restart**: Eliminated UI hangs during server restarts by implementing a fire-and-forget restart request paired with aggressive polling of a new `/api/health` endpoint.
- **[Hotfix 13] Hotfix/Release Workflow**: Added specialized skills for automated hotfixing and release management to ensure consistent QA and tagging.
- [Hotfix 12] Fixed setup wizard re-triggering and configuration discrepancy by unifying config resolution between CLI/Gateway and UI; `powerdirector.config.json` is now the preferred filename across all environments. (2026-03-13)
- [Hotfix 11] Resolved client-side exception in Chat UI, fixed media rendering in multi-part content, and improved URL regex for assets with query params. (2026-03-12)
- [Hotfix 10] Fixed critical regression in provider router where 429 errors caused infinite retry loops; implemented per-model cooldowns to allow immediate fallback to alternative models. (2026-03-12)
- [Hotfix 10] Enforced strict tool isolation for Gemini CLI by adding `--approval-mode plan -p -`, preventing autonomous workspace modifications.
- [Hotfix 10] Fixed JSON response stripping in Gemini CLI provider to ensure the agent receives the full tool-calling payload.
- [Hotfix 10] Resolved "jumping" chat interface prompt glitch by stabilizing message sorting logic.
- [Hotfix 10] Added automatic media rendering and JSON pretty-printing to tool execution blocks.
- [Hotfix 10] Increased UI update restart timeout to 2000ms for clean gateway connection cleanup.
- [Hotfix 10] Resolved "Detached HEAD" warning in the UI update flow.
- [Hotfix 8] Fixed UI regression where Gemini CLI's conversational "thinking" text was merged into subsequent JSON blocks.
- [Hotfix 9] Fixed UI state bug where streaming chunks falsely inherited completion status from tool blocks.
- [Hotfix 8] TerminalManager WebSocket connections no longer crash the UI backend; `ws` is strictly excluded from Next.js server-edge bundle resolution.
- [Hotfix 8] The `google-gemini-cli` adapter now injects a critical system instruction to forbid the CLI binary from running its own internal tools.
- [Hotfix 5] Fixed missing Custom Model dropdown text input bug.
- [Hotfix 5] Removed explicit Anthropic default from initial Setup Wizard config.
- [Hotfix 5] Updated Gemini 3.0 Pro preview default id to `gemini-3.1-pro-preview`.
- [Hotfix 5] Resolved visual chat log sorting bug where fast stream responses appeared above newer user messages.
- [Hotfix 6] Fixed `ui:build` `TURBOPACK=auto` crash by wrapping the Next.js dev server with strict env sanitation.
- [Hotfix 6] Fixed `ui-assets-missing` offline update crash by creating a dummy index payload for legacy systemd monitors.
- [Hotfix 7] Fixed chat visual defect where independent assistant planning texts were incorrectly bundled.
- [Hotfix 7] Fixed Logs Viewer failing to auto-scroll to the bottom during initial paint.
- [Hotfix 7] Added `429 Resource Exhausted` interception logic to the `google-gemini-cli` adapter.
