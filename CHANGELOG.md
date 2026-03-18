# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0-beta.1] - 2026-03-17

### Added
- Parity roadmap for the OpenClaw post-2026-02-23 releases, including P0/P1/P2 clusters, release-by-release notes, and implementation checklist for the 1.2.0-beta.1 cycle (`powerdirector-v1.2.0-beta1.md`).

### Changed
- Bumped gateway and UI package versions to `1.2.0-beta.1` and retargeted the QA checklist to the new prerelease.
- Clarified release/hotfix QA expectations to enforce personal-config loading and agent-browser verification of core chat plus new fixes/features.

### Removed
- Temporary `QA_CHECKLIST.md` working file; QA requirements are now codified in the release/hotfix skills.

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
