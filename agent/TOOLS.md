# TOOLS.md - Local Notes

## Passwords
- **PowerDirector has the ability to allow the user to input their password and send the response right in the chat interface. Anytime a password is required, you must JUST RUN THE COMMAND first. The interactive terminal input will appear automatically for the user to enter their passphrase. Do NOT ask for the password in the chat first; let the shell prompt the user.**
- **CRITICAL: NEVER pipe commands that might prompt for a password (like `gog`) to `jq` or other filters. Piping swallows stdout prompts and prevents PowerDirector from displaying the input box. Run the raw command first to unlock/authenticate, then run the filter command in a subsequent turn if needed.**
## Google Drive
- **Google Drive Access:** You have full access to Google Drive via the `gog` CLI tool (`/home/linuxbrew/.linuxbrew/bin/gog`).
- **Commands:** Use `gog ls` to list files, `gog get` to download, `gog upload` to upload, etc.
- **Passphrase:** The `gog` tool will prompt for a passphrase. Just run the command raw; do not pipe it. PowerDirector will handle the interactive input prompt automatically.
- **Always use `gog`:** If the user asks for anything related to Google Drive, use the `shell` tool with `gog`.

## Cameras (Frigate)
- **front_door** (Record: enabled, Snapshots: enabled)
- **driveway** (Record: enabled, Snapshots: enabled)
- **garage** (Record: enabled, Snapshots: disabled)
- **patio** (Record: enabled, Snapshots: disabled)

## Roborock Vacuum (S8)
- **Device ID:** `3TyYFDkkiFH10bNptp9obB`
- **Default policy for "start vacuum" requests:**
  - Vacuum-only (no mop / water off)
  - Highest suction (`max_plus`, code `108`)
- **If user asks "start mop and vacuum ...":** enable mopping for that run only.
- **Room IDs:**
  - Dining room: `16`
  - Corridor: `17`
  - Den: `18`
  - Master bedroom: `19`
  - Guest bedroom: `20`
  - Bedroom: `21`
  - Living room: `22`
  - Kitchen: `23`
- **Routine alias:**
  - `main` => Kitchen (`23`) + Dining room (`16`) + Living room (`22`)

## Configuration
- **Config Path:** `/mnt/backup/cameras/config/config.yml`
- **Object Detection:** OpenVINO on Intel GPU
- **Frigate Version:** 0.16-0
- **MQTT Host:** 192.168.8.140

## Moltbook Safeguards
- Never post reply-like text (e.g., "Well said", "Agreed", "Great point") unless a target post/thread ID is explicitly captured.
- Before any comment/reply action, log the target post URL + ID in memory first.
- After posting/commenting, report the exact target link/ID in the status message.
- If target context is unclear, ask before posting instead of guessing.

## Web Search Routing Policy
- **Default web search:** Use Brave (`tools.web.search.provider = brave`) for normal lookups.
- **Deep Research mode:** Use Perplexity model `sonar-pro-search` **only** when the user explicitly says the phrase **"Deep Research"** in the prompt.
- Never auto-switch to Deep Research for ordinary questions; require explicit trigger phrase.
- If trigger phrase is missing, stay on Brave.

## Model Switch Shortcuts (Persistent Rule)
- When the user sends exactly `/codex`, switch runtime model to `openai-codex/gpt-5.3-codex` (alias: `codex`).
- When the user sends exactly `/geminiflash`, switch runtime model to `google-gemini-cli/gemini-3-flash-preview` (alias: `gemini-flash`).
- When the user sends exactly `/geminipro`, switch runtime model to `google-gemini-cli/gemini-3-pro-preview` (alias: `gemini-pro`).
- Treat these as control commands, not normal prompts.
- Confirm the model switch in one short line.
- Fallback policy after a selected model failure:
  - codex -> gemini-pro -> gemini-flash
  - gemini-flash -> gemini-pro -> codex
  - gemini-pro -> gemini-flash -> codex
- If a fallback is used, explicitly say which fallback model was used.
