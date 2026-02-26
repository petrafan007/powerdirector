# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0-beta.4] - 2026-02-25

### Fixed
- Standardized versioning across `package.json` files to resolve discrepancy.
- Implemented `src/bootstrap.ts` to ensure `POWERDIRECTOR_STATE_DIR` is respected before path resolution, enabling proper environment isolation.
- Fully purged oversized 1.4GB archive and sensitive `.bak` files from Git history.
- Restored missing `src/media/` and critical source files accidentally deleted during sanitization.

## [1.0.0-beta.3] - 2026-02-25

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
