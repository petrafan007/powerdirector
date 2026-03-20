# PowerDirector Integration Tasks

## 🔒 PowerDirector Parity Recovery Plan (Approved / Complete)
- [x] **Approval Gate**
  - [x] Do not execute parity code changes until this section is approved.
  - [x] After approval, execute strictly section-by-section with proof after each section.
    - [x] Check items off this list as you do them.

### Wave 1: Security & Routing Core (Complete)
- [x] Fail-closed cross-channel routing/session isolation
- [x] Sandbox: block Docker join container networking
- [x] Heartbeat delivery semantics reset
- [x] Config fail-closed on load/validation errors
- [x] `gateway.auth.mode` enforcement
- [x] Browser SSRF redirect-chain hardening
- [x] Gateway restart loop guards

### Wave 2: Secrets, Config Validate, Backup, Reliability (Complete)
- [x] **External Secrets CLI** (`secrets audit/configure/apply/reload`)
- [x] **SecretRef Normalization** & wide coverage
- [x] **Config Validate CLI** (`config validate`)
- [x] **Backup System** (`backup create/verify`)
- [x] Subagent announce/delivery state machine fixes
- [x] Model fallback chain fixes
- [x] Cron restart catch-up staggering
- [x] Bedrock quota classification as rate_limit
- [x] **Full Rebranding** (OpenClaw -> PowerDirector across all source/apps/extensions)
- [x] **UI Build Parity** (Next.js production build with backend sync fixes)

## 🔜 Wave 3: Platform & Browser Ops (Next)
- [ ] Health/readiness endpoints `/health|/healthz|/ready|/readyz` (Partially done in Wave 2)
- [ ] Browser extension handshake/init/fill fixes
- [ ] Browser relay reconnect tolerance & startup diagnostics
- [ ] `browser.relayBindHost`
- [ ] CDP URL normalization & wildcard debugger rewrite
- [ ] Browser session cleanup on session reset/delete
