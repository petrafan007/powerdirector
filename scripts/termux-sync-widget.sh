#!/data/data/com.termux/files/usr/bin/bash
# PowerDirector OAuth Sync Widget
# Syncs Claude Code tokens to PowerDirector via SSH
# Place in ~/.shortcuts/ on phone for Termux:Widget

termux-toast "Syncing PowerDirector auth..."

# Run sync on configured server
SERVER="${POWERDIRECTOR_SERVER:-${CLAWDBOT_SERVER:-powerdirector-host}}"
RESULT=$(ssh "$SERVER" '$HOME/powerdirector/scripts/sync-claude-code-auth.sh' 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    # Extract expiry time from output
    EXPIRY=$(echo "$RESULT" | grep "Token expires:" | cut -d: -f2-)

    termux-vibrate -d 100
    termux-toast "PowerDirector synced! Expires:${EXPIRY}"

    # Optional: restart powerdirector service
    ssh "$SERVER" 'systemctl --user restart powerdirector' 2>/dev/null
else
    termux-vibrate -d 300
    termux-toast "Sync failed: ${RESULT}"
fi
