# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-beta.3] - 2026-02-25

### Fixed
- Restored missing source files (e.g., `src/media/`, `openclaw-tools.ts`) that were accidentally deleted during sanitization.
- Verified build integrity through a full `tsc` pass.
- Bypassed hardcoded OAuth secrets in `extensions/google-antigravity-auth/index.ts`.

## [1.0.0-beta.2] - 2026-02-25

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
