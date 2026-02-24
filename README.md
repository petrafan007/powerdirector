# PowerDirector

PowerDirector is a production-focused fork of the OpenClaw agent gateway. It keeps the upstream OpenClaw feature set (chat, tools, skills, channels, cron, nodes, docs) while preserving PowerDirector-specific additions (chat attachments, terminal, model/provider selector, media rendering) and operational defaults. This repo is the public distro; personal data and runtime artifacts are excluded.

## Quick Start
1. Install dependencies
   - `npm ci`
   - `npm --prefix ui ci`
2. Build
   - `npm run build`
   - `npm --prefix ui run build`
3. Run (development)
   - Backend: `npm run dev`
   - UI: `npm --prefix ui run dev` (default port 3007)
4. Test (smoke)
   - `npm test` (runs gateway/config/memory smoke suite)

## CLI
The CLI entrypoint is `powerdirector` (alias `pdir`). Common commands:
- `powerdirector status`
- `powerdirector gateway run --bind loopback --port 18789`
- `powerdirector config get`
- `powerdirector config set <path> <value>`

## Configuration
- Default config file: `powerdirector.config.json` in repo root (sanitized).
- Update channel in config remains `stable`; releases are tagged. The initial GitHub release is `v1.0.0-beta.1`.
- Tools/search keys and gateway token are blank by default; set your own values before production use.

## Features (supported)
- Chat with model/provider selector, attachments, media rendering.
- Tools/skills runtime and policy controls.
- Channels, sessions, cron, usage, logs, debug, nodes pages (parity with OpenClaw UI).
- Terminal with shell selector and idle-timeout.
- Docs pages under `/docs` (mirrors upstream structure).

## Extensions, apps, and skills
Extensions, mobile/desktop apps, and many skills are inherited from OpenClaw. They are included for continuity but are “upstream/inherited, not supported or still in progress” under PowerDirector. Validate before relying on them in production; report gaps via GitHub issues.

## Updates
- Planned distribution: GitHub repo `petrafan007/powerdirector`.
- Future updates will pull from GitHub releases/tags; channel stays stable unless you opt into beta tags.

## Support
- Contact: GitHub issues on `petrafan007/powerdirector`.
- Discord and X channels will be announced soon.

## License
Apache-2.0 (see `LICENSE`).
