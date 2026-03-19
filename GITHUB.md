# Public Release and Ongoing Versioning Guide

This revision is the concrete plan for shipping *PowerDirector* to GitHub from this machine, keeping the personal runtime at `<runtime-dir>` and staging the new public repo in `<repo-source-dir>`. No git operations have been executed yet—this is the approved runbook to follow once you give the go-ahead.

---

# SECTION 0 - PROJECT-SPECIFIC PLAN (PowerDirector → GitHub)

## Goals
- Create a clean, reproducible source tree in `<repo-source-dir>` ready for GitHub.
- Keep the personal runtime intact at `<runtime-dir>`.
- Ship the initial GitHub release on the **beta** channel while keeping the UI/config default channel unchanged for users; future updates will pull from the new GitHub repo.

## Execution Order (once approved)
1) **Full backup (pre-flight, no git yet)**
   - Tarball the current runtime to `<runtime-dir>_backup_$(date +%Y%m%d_%H%M%S).tar.gz`
   - Exclude: `node_modules`, `ui/.next`, `dist`, `logs`, `nohup.out`, `*.log`, `gemini_tmp_images`, `media` (large), `powerdirector.db` (optional: include separate secure copy if desired)
   - Include: `src`, `ui`, `config`, `docs`, `scripts`, `tests`, `powerdirector-source`, `package-lock.json`, `powerdirector.config.json`, `powerdirector.config.json.bak`, `LICENSE`, `README.md`, `GITHUB.md`, `RELEASE_NOTES_*`, `TASKS.md`, `QA.md`
2) **Stage repo workspace**
   - Create `<repo-source-dir>`
   - `rsync` sanitized source from `<runtime-dir>/` into `<repo-source-dir>/`
   - Remove runtime-only artifacts (`node_modules`, `ui/.next`, `dist`, `logs`, `media` if oversized), keep lockfile
3) **Sanitize for public**
   - Scan for secrets/TODO/stub per checklist (Section 1/Step A)
   - Ensure `powerdirector.config.json` in the staged repo is template-safe (no personal tokens) and update channel is set to `beta`
   - Confirm `LICENSE`, `README.md`, `RELEASE_NOTES_0.1.0-alpha.md` (or new CHANGELOG) present
4) **Versioning for first GitHub release**
   - Set `package.json` version to `1.0.0-beta.1`
   - Add CHANGELOG entry for `1.0.0-beta.1` (Keep a Changelog format)
5) **Wire update feed to GitHub (code + config)**
   - Configure `powerdirector.config.json` → `update.channel = "beta"`
   - Set update runner to use the new GitHub remote once repo is created:
     - Origin: `https://github.com/<org-or-user>/powerdirector` (to be set at execution time)
     - Branch: `main`
     - Tags: `v*` with beta suffix for prerelease
   - Verify `src/infra/update-runner.ts` path resolves repo root in `<repo-source-dir>` and respects config channel `beta`
6) **Build/validate in staged tree**
   - `npm ci`
   - `npm --prefix ui ci`
   - `npm run build`
   - `npm --prefix ui run build`
   - `npm --prefix ui run lint` (warnings acceptable, errors must be zero)
   - `npm test` (smoke set: `src/gateway/call.test.ts`, `src/config/redact-snapshot.test.ts`, `src/memory/qmd-manager.test.ts`)
7) **Git steps (execute only after approval)**
   - `git init` in `<repo-source-dir>`
   - Commit sanitized tree
   - Tag `v1.0.0-beta.1`
   - Set remote to GitHub and push branch + tag
8) **Post-publish**
   - In personal runtime `<runtime-dir>`, set `update.channel=beta` and configure updater to track the GitHub repo; run one dry-run update to confirm fetch succeeds.

---

---

# SECTION 1 - FIRST PUBLIC RELEASE

## 1. Hard Requirements (Must Pass Before Release)

### Repository Safety

- [ ] No secrets in repo (including git history)
- [ ] No internal/private URLs, tokens, credentials, or customer data
- [ ] No scaffold, stub, placeholder, or TODO code in production paths
- [ ] README is complete and accurate
- [ ] LICENSE file is present
- [ ] CHANGELOG.md exists
- [ ] Lockfile committed
- [ ] Clean build from a fresh environment

### Branching and State

- [ ] Release from `main`
- [ ] Working tree is clean
- [ ] CI is passing on main
- [ ] Local branch is up to date with remote

---

## 2. Versioning Model (Applies to All Releases)

Use Semantic Versioning:

```
MAJOR.MINOR.PATCH
```

### Increment Rules

- MAJOR: breaking changes
- MINOR: new backward-compatible features
- PATCH: bug fixes only

Examples:

- 1.0.0 -> 1.0.1 (bug fix)
- 1.2.0 -> 1.3.0 (new feature)
- 1.4.2 -> 2.0.0 (breaking change)

Tag format:

```
vX.Y.Z
```

Example:

```
v1.2.3
```

### Single Source of Truth

Define exactly one canonical version location:

- Node: package.json
- Python: pyproject.toml
- .NET: csproj
- Go: tags only (optional version file)

Automation must update only the canonical source.

---

## 3. Selecting the First Public Version

Stable public launch:

```
v1.0.0
```

If not production-stable:

```
v0.1.0
```

---

## 4. Changelog Rules

Use a structured format (Keep a Changelog style recommended).

Each release must include:

```
## [X.Y.Z] - YYYY-MM-DD

### Added
### Changed
### Fixed
### Removed
```

Rules:

- Never delete previous entries
- Never rewrite changelog after release
- Clearly describe breaking changes
- Include migration steps if necessary

Automation must:

- Insert new section at top
- Use current date automatically
- Fail if changelog is missing

---

## 5. First Release Automation Flow

### Inputs

- RELEASE_VERSION
- RELEASE_TAG = vRELEASE_VERSION
- RELEASE_BRANCH = main
- DRY_RUN (optional)

---

### Step A - Preflight Validation (Fail Fast)

Automation must:

- [ ] Ensure on RELEASE_BRANCH
- [ ] Ensure working tree clean
- [ ] Pull latest changes
- [ ] Install dependencies
- [ ] Lint
- [ ] Typecheck
- [ ] Run tests
- [ ] Build production build
- [ ] Scan for TODO/FIXME/stub/placeholder/not implemented
- [ ] Scan for secrets (tree and history)
- [ ] Verify required files exist (README, LICENSE, CHANGELOG)
- [ ] Confirm lockfile exists

Fail immediately if any check fails.

---

### Step B - Update Version

- Update canonical version file
- Update CHANGELOG with new entry
- Commit:

```
chore(release): vX.Y.Z
```

---

### Step C - Create Annotated Tag

Create tag:

```
vX.Y.Z
```

Include short summary in tag message.

---

### Step D - Push

- Push branch to remote
- Push tag to remote

---

### Step E - Create GitHub Release

Automation must:

- Create release from tag
- Title = tag
- Body = corresponding changelog entry
- Mark as latest
- Not mark as pre-release (unless specified)

---

### Step F - Attach Artifacts (If Applicable)

Examples:

- Production build zip
- CLI binaries
- Docker image reference
- Compiled server bundle

Artifacts must:

- Be generated from clean state
- Contain no secrets
- Be reproducible

---

### Step G - Post-Release Verification

- Tag exists remotely
- GitHub Release exists
- CI passed for tag
- Artifacts accessible
- Fresh clone installs and builds cleanly

---

# SECTION 2 - HANDLING FUTURE UPDATES

All future updates must follow a controlled workflow.

---

## 6. Development Workflow for Updates

Recommended branching model:

- main (stable)
- feature/*
- fix/*
- release/* (optional)
- hotfix/* (for urgent patches)

Rules:

- Never commit directly to main
- All changes via pull request
- CI must pass before merge
- Require review before merge (recommended)

---

## 7. Version Bumping Rules for Updates

Before releasing:

1. Determine change type:
   - Breaking change -> MAJOR++
   - New feature -> MINOR++
   - Bug fix -> PATCH++

2. Reset lower segments:
   - Major bump resets minor and patch to 0
   - Minor bump resets patch to 0

Examples:

- 1.4.3 -> 1.4.4
- 1.4.3 -> 1.5.0
- 1.4.3 -> 2.0.0

Automation may calculate next version unless explicitly provided.

---

## 8. Standard Update Release Flow

### Step 1 - Confirm Stability

- All PRs merged
- CI passing
- No known critical issues

### Step 2 - Run Full Validation

- Install
- Lint
- Typecheck
- Test
- Build
- Secret scan
- Stub scan

### Step 3 - Update Version and Changelog

- Update canonical version file
- Add new CHANGELOG section
- Commit:

```
chore(release): vX.Y.Z
```

### Step 4 - Tag

Create:

```
vX.Y.Z
```

### Step 5 - Push and Release

Push commit and tag.
CI should create GitHub Release automatically.

---

## 9. Pre-Releases (Beta / RC)

Tag format:

```
v1.2.0-beta.1
v1.2.0-rc.1
```

Rules:

- Do not mark as latest
- Mark as pre-release in GitHub
- Do not override stable tag

Automation must support prerelease flag and suffix handling.

---

## 10. Hotfix Process

If urgent fix required:

1. Branch from latest stable tag:

```
hotfix/vX.Y.Z
```

2. Apply fix
3. Bump PATCH version
4. Merge to main
5. Tag new version
6. Release normally

Never modify or reuse an existing tag.

---

## 11. Breaking Changes and Deprecation

For breaking changes:

- Require MAJOR version bump
- Document clearly in CHANGELOG
- Provide migration instructions
- Update README examples
- Consider deprecating APIs in minor release before removal

---

## 12. Rollback Strategy

If bad release published:

Do NOT delete tag.

Instead:

- Publish new PATCH version fixing issue
- Document issue in changelog

Delete release/tag only if absolutely necessary and confirmed unused.

---

## 13. Continuous Integration Rules

CI must:

On PR:
- Install
- Lint
- Typecheck
- Test
- Build

On tag `v*`:
- Re-run full validation
- Create GitHub Release
- Upload artifacts
- Publish package/container if applicable

Release must fail if:

- Tests fail
- Build fails
- Security scan fails
- Secret scan fails

---

## 14. Automation Safety Requirements

Automation must be:

Deterministic:
- Same inputs produce same outputs

Idempotent:
- If tag exists, abort
- If release exists, abort

Safe:
- Never overwrite tags
- Never force-push to main
- Never auto-increment blindly without confirming change type

---

## 15. Ongoing Maintenance Checklist

Every release must confirm:

- [ ] No TODO/FIXME/stub in production paths
- [ ] No secrets added
- [ ] Dependency vulnerabilities reviewed
- [ ] Tests updated
- [ ] Documentation updated
- [ ] CI configuration still valid

---

## 16. Release Definition of Done (All Versions)

A release is complete when:

- [ ] Version updated in canonical file
- [ ] CHANGELOG updated
- [ ] Commit pushed
- [ ] Tag created
- [ ] GitHub Release created
- [ ] CI passed on tag
- [ ] Artifacts uploaded (if applicable)
- [ ] Fresh clone installs and builds cleanly
- [ ] No secrets or scaffold code present

---
