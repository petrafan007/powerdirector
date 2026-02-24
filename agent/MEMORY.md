# MEMORY.md

## Long-term Preferences

### Web Search Behavior (2026-02-09)
- User preference: keep **Brave** as the default for normal web search.
- Use **Perplexity `sonar-pro-search`** only when the user explicitly includes the phrase **"Deep Research"** in their prompt.
- Do not use `sonar-pro-search` for normal web search requests without the explicit trigger phrase.

### Runtime Model Switch Shortcuts (2026-02-09)
- User wants fast slash-style model switching commands:
  - `/codex` -> `openai-codex/gpt-5.3-codex` (alias: `codex`)
  - `/geminiflash` -> `google-gemini-cli/gemini-3-flash-preview` (alias: `gemini-flash`)
  - `/geminipro` -> `google-gemini-cli/gemini-3-pro-preview` (alias: `gemini-pro`)
- These inputs are control commands and should trigger a model switch confirmation, not normal completion.
- Fallback behavior the user approved:
  - codex -> gemini-pro -> gemini-flash
  - gemini-flash -> gemini-pro -> codex
  - gemini-pro -> gemini-flash -> codex
- If fallback occurs, explicitly report which fallback model was used.

### Roborock Default Cleaning Policy (2026-02-11)
- Default for any "start vacuum" / room-clean request is:
  - **Vacuum-only** (no mop / water off)
  - **Highest suction** (`max_plus`)
- Only enable mopping or lower suction when the user explicitly asks for it.

## Notes
- These are explicit operating rules and should be followed consistently in future sessions.
