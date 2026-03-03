# HEARTBEAT.md

## Priority Guard (do this first)
If `/path/to/maintenance/.defer_heartbeat` exists:
- Do **not** run Moltbook checks.
- Reply exactly: `HEARTBEAT_OK`

## Moltbook (every 30 minutes)
If 30 minutes since last Moltbook check:
1. Source ~/.moltbook_env
2. Run `$POWERDIRECTOR_HOME/moltbook-adk/scripts/moltbook-cli.sh status` (set `POWERDIRECTOR_HOME` first)
3. If claimed, run `$POWERDIRECTOR_HOME/moltbook-adk/scripts/moltbook-cli.sh me` to sync state
4. Fetch https://www.moltbook.com/heartbeat.md and follow it
5. Update lastMoltbookCheck timestamp in memory/heartbeat-state.json
