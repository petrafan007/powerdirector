# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0-beta.2] - 2026-03-07

### Fixed
- Chat `default/default` sends now explicitly clear sticky session model overrides, so saving new defaults in config and sending with `Default` immediately uses the latest configured primary/fallback chain instead of a stale session-pinned model.
- Chat config saves now notify the live UI to refresh its provider catalog, and fallback events no longer silently rewrite the user's provider/model picker selection away from `Default`.
- Providerless same-provider fallback entries now normalize against the configured primary model provider during default routing, so entries like `gpt-5.1-codex-max` no longer disappear from the execution chain when the primary is `openai-codex/...`.
- Chat transcript ordering now sorts by the real millisecond message timestamps first and only uses the per-turn sequence counter for exact timestamp ties, preventing later user prompts from jumping ahead of earlier assistant replies when turns land within the same second.
- The main chat page no longer crashes when opening sessions after setup; provider/model persistence state is initialized before the config-refresh effect runs in production builds.
- Setup/config provider aliases for Codex CLI and Gemini CLI now normalize to the runtime IDs (`openai-codex`, `google-gemini-cli`), so wizard-saved CLI providers appear in the dropdown and route successfully.
- The session compaction "Context Baseline" card now renders full-width in the normal transcript flow and keeps stable chronological ordering instead of appearing as a centered floating card.
- Standard-port/reverse-proxy installs now proxy `/terminal-ws` through the UI server to the configured terminal websocket port, restoring the embedded terminal on HTTPS/default-port deployments.

## [1.1.0-beta1] - 2026-03-01

### Added
- Added manual model input for OpenRouter and Generic AI providers in the Setup Wizard.
- Automated creation of an initial "General Chat" session after completing the setup wizard to avoid an empty-state experience.

### Fixed
- Fixed critical 500 server error when streaming with Inception (mercury-2) model by implementing `disableTools` flag to skip unsupported tool parameters.
- Resolved "Application error: a client-side exception has occurred" in the configuration Agents list by adding defensive rendering checks for malformed schema data.
- Corrected provider identification in Setup Wizard to ensure OpenRouter is saved correctly in `config/models` (previously incorrectly defaulting to Anthropic).
- Ensured the primary agent model is correctly set from the wizard selection.
- **Optimized prompt length**: Implemented automatic skipping of large tool definitions in the text prompt when they are handled natively by the provider, reducing prompt size by up to 90% (e.g., from 48k to < 5k characters).
- **Improved Provider Routing**: Standardized error reporting in `ProviderRouter` to correctly identify and report provider cooldowns, distinguishing them from configuration errors.
- Web chat now preserves session pivots and new chat creation by honoring the server-supplied `sessionId` in SSE steps/finals instead of pinning to the original request session.
- Default model selection no longer blocks image/document uploads—attachment validation is skipped when using the configured Default fallback chain so the gateway can auto-route to the vision-capable model.
- Abort failures no longer strand the UI in a paused state; chat resumes listening if a pause request is rejected or errors, preventing dropped output.
- `/api/chat` streams now cancel gateway runs when the client disconnects, avoiding orphaned executions after a browser/tab closes.
- Remote gateway mode has been reimplemented using the Gateway protocol (from OpenClaw) with proper `chat.send`/`chat.abort` requests and chat event streaming; local monolith mode remains available.
- Setup Wizard numeric fields for timeout and ports now allow fully clearing/editing values without forcing a digit, fixing spinner-field overwrite friction.
- Setup Wizard Features now lists Gateway before Terminal and defaults Gateway port to `3007` (matching local monolith defaults).
- Setup Wizard now normalizes legacy bind values (`localhost`, `0.0.0.0`) to supported config values before saving.
- Setup Wizard gateway save is now compatibility-safe across gateway config shapes by updating either top-level `gateway.port/bind` or legacy `gateway.control.port/bind`.
- Removed tracked personal runtime artifacts from the repository (`agent/media/*`, `diagnostics/telemetry.ndjson`, `memory/*.md`, and `moltbook-adk`).
- Auth monitor runbook paths are now home-relative (`%h/powerdirector/...` for systemd and `$HOME/powerdirector/...` in script guidance) instead of hardcoded user paths.
- Restored the Logs API endpoint (`/api/logs/tail`) so the Logs page can load and stream log lines again instead of returning 404.
- Fixed chat "Unknown provider" failures when the UI is set to `Default` by treating `default` provider/model as "no explicit override" in both the chat UI payload and backend route normalization.
- Fixed Terminal disconnects on non-default ports by loading `terminal.port` from config and wiring the Terminal UI websocket to that configured port.
- Prevented false setup reruns by treating legacy wizard completion markers (`lastRunMode`/`lastRunVersion`/`lastRunCommand`) as valid completion state when `lastRunAt` is missing.
- Repo-backed installs now use GitHub git release channels correctly for `stable`/`beta`/`dev`, including detection of force-updated tags that keep the same version string.
- Git-based updates now preserve `powerdirector.config.json` during checkout/build so configured instances can install updates without config drift or dirty-worktree blocks.
- Config > Updates now removes the duplicate legacy `Auto Install` toggle, keeps `Auto -> Enabled` as the only automatic install control, and adds an `Install Now` action with a themed progress modal plus explicit `Restart`/`Close` completion actions.
- The embedded monolith runtime now uses the git-aware startup checker/update daemon, so Config > Updates and startup auto-checks follow the same channel rules as the standalone gateway.
- Persisted git update state now keeps same-version/different-SHA releases visible during the throttle window, so beta/dev auto-updates still install force-updated tags instead of dropping them until the next full fetch.
- Updater child processes now strip inherited `TURBOPACK=auto`, preventing `pnpm ui:build` from failing under the running UI server with the Next.js "Multiple bundler flags set" error.
- Runtime-only `diagnostics/`, `memory/`, and `media/` folders are now gitignored at the repo root so live instances can keep their local state without blocking Git-based updates as a dirty worktree.
- Fresh git checkouts now install the missing build-time packages needed by the root TypeScript build, and the root workspace exposes `ui:build` so the updater's install pipeline can complete from a clean clone.
- The setup wizard and sidebar footer now display the actual app version from the build instead of the stale `1.0.0`/`1.0.0-beta.2` fallback strings.

## [1.0.0-beta.2] - 2026-02-25

### Fixed
- Standardized versioning across `package.json` files to resolve discrepancy.
- Implemented `src/bootstrap.ts` to ensure `POWERDIRECTOR_STATE_DIR` is respected before path resolution, enabling proper environment isolation.
- Fully purged oversized 1.4GB archive and sensitive `.bak` files from Git history.
- Restored missing `src/media/` and critical source files accidentally deleted during sanitization.

### Added
- Implemented `UpdateDaemon` for background polling of GitHub updates (`src/infra/update-daemon.ts`).
- Added native daemon scheduling for channel-based rollouts (immediate for Dev/Beta, delayed with jitter for Stable).
- Added unit tests for time-fast-forward validation of the update daemon (`src/infra/update-daemon.test.ts`).

### Changed
- Wove the update daemon into `src/gateway/server.impl.ts` so it launches when the WebSocket server goes online and shuts down gracefully.
- Modified `src/infra/update-startup.ts` to support `checkOnStart` when the system detects a Git clone installation instead of solely relying on NPM packages.
- Tightened TypeScript type definitions inside `src/config/types.powerdirector.ts` to properly enforce the schema objects that exist in `src/config/zod-schema.ts`.

### Fixed
- Re-architected `/api/channels/status` Next.js API to directly inject the embedded `PowerDirectorService` gateway instance, safely bypassing an internal HTTP fetch to port `3008` which catastrophically conflicted with WebSocket upgrades from the `TerminalManager`.
