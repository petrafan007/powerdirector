# PowerDirector Project Memory

## Technical State (2026-03-20)
- **Current Version:** 1.2.0-beta.3
- **Primary Source:** /home/jcavallarojr/powerdirector-source
- **Test Environment:** /home/jcavallarojr/powerdirector-newusertest (Port 4007)
- **Branding:** 100% PowerDirector (rebranded from OpenClaw)

## Major Milestones
### Wave 2 Release (Complete)
- **Secrets Management:** Implemented External Secrets CLI and SecretRef normalization. Required refs now fail-closed at startup.
- **Validation & Reliability:** Added `config validate` CLI. Hardened model fallbacks, cron staggering, and Bedrock error classification.
- **Backup System:** Added comprehensive local backup/verify CLI.
- **UI Production Build:** Successfully migrated to Next.js production build architecture.
- **Backend Sync:** Perfected `ui/scripts/sync-backend.sh` with quote-safe regexes and exhaustive path mapping for `apps/` and `extensions/`.

## Critical Build Context
- **Next.js UI:** Embedded gateway mode. Build requires `NODE_OPTIONS="--max-old-space-size=8192"` due to backend source volume.
- **Zod Schema:** Root schema must be unwrapped using `unwrapSchema` (handling ZodEffects/ZodPipeline) before extension to avoid `.shape` or `.extend` errors.
- **Plugin-SDK:** Absolute imports `powerdirector/plugin-sdk/*` must be mapped to `@/src-backend/plugin-sdk/*` during UI sync for proper resolution.
- **Native Modules:** `better-sqlite3`, `node-pty`, `sharp`, `node-llama-cpp`, and `@napi-rs/canvas` must be in `serverExternalPackages` in `ui/next.config.ts`.

## Environment Setup
- **Ports:** 4007 (Integrated UI + Gateway), 4008 (Terminal WebSocket).
- **Config:** Use `POWERDIRECTOR_CONFIG_PATH` to point to local configuration.
- **Home:** Default state dir is `~/.powerdirector`.
