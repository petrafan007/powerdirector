# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0-beta.3] - 2026-03-15

### Fixed
- **[Hotfix 14] Image Rendering & Web Search**: Expanded UI regex support for `MEDIA:` and `Image found:` patterns to seamlessly render images inside chat bubbles. Enhanced the Web Search tool to output direct image URLs from DuckDuckGo Instant Answers.
- **[Hotfix 14] NANO BANANA Generator**: Restored functionality to the `nano-banana-pro` skill by introducing a dedicated `run.sh` entrypoint, fixing path resolution to properly execute the internal `image.py` script, and upgrading the configured Google GenAI model to the available `imagen-4.0-generate-001`.
- **[Hotfix 14] Resolved UI Crash**: Fixed a critical circular dependency between `agent-instance.ts` and `registry/tools.ts` that caused `PowerDirectorService` to be undefined during API requests.
- **[Hotfix 14] Robust Root Resolution**: Implemented explicit search paths for the project root in both `ui/lib/paths.ts` and `src/config/paths.ts` to ensure consistent configuration loading across varied environments (standard vs. QA test directories).
- **[Hotfix 14] Personal Instance Recovery**: Successfully recovered the personal instance UI by nuking orphaned gateway processes and rebuilding the Next.js server with the latest Hotfix 13/14 fixes.
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
