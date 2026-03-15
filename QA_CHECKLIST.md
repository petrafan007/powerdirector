# PowerDirector Flawless UI & Chat QA Checklist

This checklist tracks the mandatory verification of PowerDirector v1.1.0-beta.3. No item shall be checked until verified via `agent-browser` in `~/powerdirector-newusertest` on ports 4007/4008.

## 1. Environment Setup
- [x] Complete wipe of `~/powerdirector-newusertest`
- [x] Fresh `git clone` from GitHub
- [x] Configuration sync from `~/powerdirector` (API keys & settings)
- [x] Successful full build (`npm install`, `npm run build`, `npm run ui:build`)
- [x] Gateway & UI running on ports 4007/4008

## 2. Google Gemini CLI Validation (`google-gemini-cli/gemini-3.1-pro-preview`)
- [ ] **Message Integrity**: Send 3+ follow-up messages.
- [ ] **Correct Ordering**: All messages appear in strict chronological order.
- [ ] **Refresh Resilience**: Refreshing the browser preserves order and history perfectly.
- [ ] **Image Rendering (Generated)**: NANO BANANA generates an image; thumbnail shows in chat.
- [ ] **Image Rendering (Web)**: Pull an image from the web; thumbnail shows in chat.
- [ ] **Image Interaction**: Clicking thumbnails opens the full-size image.
- [ ] **Execution Visibility**: Tool calls show as distinct responses with visible JSON.
- [ ] **No Squishing**: Multiple execution calls remain separate and distinct.
- [ ] **Final Bubble**: The last response is always a regular chat bubble, never a tool block.

## 3. Ollama Validation (`ollama-desktop/gpt-oss:120b-cloud`)
- [ ] **Message Integrity**: Send 3+ follow-up messages.
- [ ] **Correct Ordering**: All messages appear in strict chronological order.
- [ ] **Refresh Resilience**: Refreshing the browser preserves order and history perfectly.
- [ ] **Image Rendering (Generated)**: NANO BANANA generates an image; thumbnail shows in chat.
- [ ] **Image Rendering (Web)**: Pull an image from the web; thumbnail shows in chat.
- [ ] **Image Interaction**: Clicking thumbnails opens the full-size image.
- [ ] **Execution Visibility**: Tool calls show as distinct responses with visible JSON.
- [ ] **No Squishing**: Multiple execution calls remain separate and distinct.
- [ ] **Final Bubble**: The last response is always a regular chat bubble, never a tool block.

## 4. System & Anticipatory QA
- [ ] **Log Audit**: Zero errors in `ui/logs/powerdirector-YYYY-MM-DD.log`.
- [ ] **Anticipatory Test**: [Describe discovered edge case, e.g., stream disconnection handling].
- [ ] **Hotfix Workflow**: Any issues found were fixed in `source`, pushed to GitHub, and re-verified.

## 5. Final Delivery
- [ ] GitHub tag `v1.1.0-beta.3` force-updated with all verified fixes.
- [ ] Personal instance upgrade path confirmed safe (preserves all personal files).
