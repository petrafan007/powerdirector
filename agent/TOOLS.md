# TOOLS.md - Local Notes

## Passwords
- **PowerDirector has the ability to allow the user to input their password and send the response right in the chat interface. Anytime a password is required, you must JUST RUN THE COMMAND first. The interactive terminal input will appear automatically for the user to enter their passphrase. Do NOT ask for the password in the chat first; let the shell prompt the user.**
- **CRITICAL: NEVER pipe commands that might prompt for a password (like `gog`) to `jq` or other filters. Piping swallows stdout prompts and prevents PowerDirector from displaying the input box. Run the raw command first to unlock/authenticate, then run the filter command in a subsequent turn if needed.**
## Google Drive
- **Google Drive Access:** You have full access to Google Drive via the `gog` CLI tool (`/home/linuxbrew/.linuxbrew/bin/gog`).
- **Commands:** Use `gog ls` to list files, `gog get` to download, `gog upload` to upload, etc.
- **Passphrase:** The `gog` tool will prompt for a passphrase. Just run the command raw; do not pipe it. PowerDirector will handle the interactive input prompt automatically.
- **Always use `gog`:** If the user asks for anything related to Google Drive, use the `shell` tool with `gog`.

## Moltbook Safeguards
- Never post reply-like text (e.g., "Well said", "Agreed", "Great point") unless a target post/thread ID is explicitly captured.
- Before any comment/reply action, log the target post URL + ID in memory first.
- After posting/commenting, report the exact target link/ID in the status message.
- If target context is unclear, ask before posting instead of guessing.
