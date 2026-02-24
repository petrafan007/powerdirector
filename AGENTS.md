# Agents (PowerDirector)

PowerDirector preserves the OpenClaw agent model (gateway, sessions, tools/skills, bindings). Use the PowerDirector CLI (`powerdirector` or `pdir`) and the UI pages (`/agents`, `/skills`, `/tools`, `/bindings`) to configure agents.

## What works
- Agent defaults, profiles, tool/skill policies, bindings, sessions.
- UI parity with OpenClaw agents page.
- Skills/config storage wired to PowerDirector gateway runtime.

## Upstream/In-Progress Components
The repo includes OpenClaw agent-related docs/assets for continuity. They are “upstream/inherited, not supported or still in progress” under PowerDirector. Verify compatibility before relying on:
- Mobile/desktop apps (iOS, macOS, Android).
- Upstream-only commands, URLs, and team processes referenced in extensions/skills docs.

## Paths and CLI
- CLI: `powerdirector <command>` (alias `pdir`).
- Config: `powerdirector.config.json` (sanitized in this repo).
- Workspace: user-defined; not set in repo config (blank by default).

## Support
- Open issues at `petrafan007/powerdirector`. Discord/X channels coming soon.
