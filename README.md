# PowerDirector

**Reliability-first AI orchestration and chat control.**

## 📖 About

PowerDirector is a high-performance orchestration platform designed for running resilient, tool-capable AI assistants across dozens of chat platforms and model providers. It bridges the gap between raw LLM APIs and an operator-grade production terminal. 

Originally forked from OpenClaw, PowerDirector has evolved into a specialized command-and-control center for AI agents. It prioritizes **High-Fidelity Interaction**, enabling agents to perform real-world system tasks—like administrative shell operations, IoT management, and multi-channel broadcasting—with the transparency and responsiveness of a live production environment. 

Whether you are managing a fleet of remote nodes via the Node Host server or interacting with a local instance through the PTY-backed interactive shell, PowerDirector ensures zero-downtime reliability through a sophisticated circuit-breaker and fallback routing architecture.


## 🚀 Key Features

### 🛡️ Multi-Provider Reliability
- **Native Wrappers**: First-class support for Anthropic, OpenAI, Google Gemini (REST & CLI), OpenAI Codex CLI, Z.AI (GLM), Minimax, Mistral, Perplexity, OpenRouter, HuggingFace, Ollama, and more.
- **Circuit Breakers**: Every provider is protected by automated circuit breakers that detect timeouts or errors.
- **Configurable Fallback Chain**: When a model fails, PowerDirector follows a user-configured ordered chain (primary → fallback 1 → fallback 2) before stopping. It never silently tries random providers.
- **All-Models-Failed Modal**: If every model in the chain fails, the UI shows a themed error dialog listing each provider failure with its error code and message — no silent drops.

### 🎯 Model Selection & Fallback Chain

The model selection UI dropdown drives a two-tier fallback system:

**When "Default" is selected:**
1. Attempts the configured **primary** model (e.g. `google-gemini-cli/gemini-3-pro-preview`).
2. If that fails, tries **fallback 1** (e.g. `google-gemini-cli/gemini-3-flash-preview`).
3. If that fails, tries **fallback 2** (e.g. `openai-codex/gpt-5.1-codex-max`).
4. If **all three fail**, shows the **All Models Failed** modal with per-provider error details.

**When an override model is selected from the dropdown (e.g. `zai/glm-4.7`):**
1. Attempts the chosen override model first.
2. If that fails, falls through the full Default chain (primary → fallback 1 → fallback 2).
3. If **all fail**, shows the **All Models Failed** modal.

The chain is configured in `powerdirector.config.json` under `agents.defaults.model`:

```json
"agents": {
  "defaults": {
    "model": {
      "primary":   "google-gemini-cli/gemini-3-pro-preview",
      "fallbacks": [
        "google-gemini-cli/gemini-3-flash-preview",
        "openai-codex/gpt-5.1-codex-max"
      ]
    }
  }
}
```

> **Hard Stop**: The router never silently falls through to unconfigured providers (e.g. Ollama, Deepseek). Only the configured chain is tried. After exhausting the chain, the UI receives structured failure data and shows the themed modal.

### 🌐 Omni-Channel Gateway
- **Unified Inbox**: Connect agents to Discord, Telegram, Slack, WhatsApp, Signal, iMessage (`imsg` RPC and BlueBubbles), Microsoft Teams, Matrix, Nostr, Email, and Google Chat simultaneously.
- **Standardized Formatting**: Ensures consistent markdown and embed rendering across all messaging protocols.

### 🐚 High-Fidelity Interactivity
- **PTY-Backed Shell**: A robust `shell` tool powered by `node-pty` that spawns real pseudoterminals. Supports `sudo` password prompts, interactive `read` commands, and real-time terminal output.
- **SSE Orchestration**: Full Server-Sent Events integration. Watch the agent’s "Thinking Process" and live tool execution chunks stream to your screen as they happen.
- **In-Chat Input**: A theme-aware, non-blocking terminal input field appears inside tool calls for instant human-in-the-loop interaction.

### 🔧 Advanced Tool Registry
- **System Control**: Direct filesystem operations, hardware monitoring, and process management.
- **Productivity**: Deep integration with Notion, GitHub, Trello, Obsidian, Things3, and Apple Notes/Reminders.
- **Web & IoT**: Headless browsing (Puppeteer), Brave/Google Search, Home Assistant, Spotify, and Sonos control.

### ⚙️ Operator-Grade Infrastructure
- **33-Section Configuration**: Categorized engine with secret masking, Zod validation, and dynamic UI forms.
- **Distributed Node Hosting**: Command and control multiple remote worker nodes via a secure authenticated transport.
- **Context Hygiene**: Smart context pruning and token budgeting (up to 20k+ tokens) to maintain agent focus without losing history.
- **Privacy First**: Aggressive autocomplete blocking, password visibility toggles, and secure credential handling via 1Password CLI.


---

## 🏗️ Architecture

PowerDirector is built on four core pillars:

### 1. Reliability Layer
Every provider is protected by a **Circuit Breaker**. When a provider fails, PowerDirector routes traffic through the configured **fallback chain** in strict order:

```
Default mode:   primary  →  fallback 1  →  fallback 2  →  ❌ All Models Failed modal
Override mode:  override →  primary     →  fallback 1  →  fallback 2  →  ❌ modal
```

The chain is hard-stopped — no silent fallthrough to unconfigured providers. See the **Model Selection & Fallback Chain** section above for config details.

### 2. Provider Ecosystem
Supports both high-speed REST APIs and advanced CLI-based agents:
- **Cloud APIs**: Anthropic, OpenAI, Google Gemini, xAI Grok, DeepSeek, Mistral, Perplexity.
- **Local/Open Platforms**: Ollama, OpenRouter, Hugging Face, ChatGLM.
- **CLI Agents**: Google Gemini CLI (headless via OAuth) and OpenAI Codex CLI (configurable approval/sandbox mode).

### 🔐 CLI Provider Configuration

PowerDirector's CLI providers (`google-gemini-cli`, `openai-codex`) are designed to run in **headless server environments** by leveraging your system's existing OAuth sessions.

**Do not inject API keys** into `powerdirector.config.json` for these providers. Instead:

1.  **Authenticate via CLI**:
    ```bash
    # For Gemini
    gemini login
    # For Codex
    codex login
    ```
2.  **Headless Operation**:
    - **Gemini**: The provider automatically uses `gemini -p ""` to bypass interactive mode while reading prompts from a temporary file/stdin.
    - **Codex**: The provider runs with configurable approval mode (`unrestricted`, `full-auto`, `interactive`, `manual`) and defaults to **unrestricted** (`--dangerously-bypass-approvals-and-sandbox`) for full access.
    - **Environment**: Both providers are spawned with `TERM=dumb`, `NO_COLOR=1`, and full `process.env` access to locate your cached credentials in `~/.gemini` or `~/.codex`.

### 3. Integrated Tooling
Agents have access to a massive registry of "skills," including:
- **System**: Shell, FileSystem, Process Management, Android/Windows control.
- **Productivity**: Notion, GitHub, Trello, Obsidian, Things3, Bear.
- **Web**: Brave/Google Search, Jina Fetch, Puppeteer Browser.
- **Media/Social**: DALL-E/Stability Image Gen, Tenor GIFs, Twitter, Reddit, LinkedIn.
- **IoT/Home**: Home Assistant, Spotify, Sonos, Bambu 3D Printers, Eight Sleep.
- **Security**: 1Password CLI integration.

### 4. Chat Gateway
A unified inbox that routes messages from any platform to your agents. Standardized message formatting ensures consistent responses across Discord embed, Telegram markdown, and Slack blocks.

### 5. High-Fidelity Interaction
PowerDirector bridges the gap between static chat and live terminals:
- **PTY-Backed Shell**: The `shell` tool uses `node-pty` to spawn real pseudoterminals, allowing for true interactive sessions including `sudo` prompts and complex CLI interfaces.
- **SSE Streaming**: Intermediate agent steps (thinking, tool calls, and PTY output chunks) are streamed via Server-Sent Events, ensuring the UI remains responsive and transparent during long-running tasks.
- **Persistent State**: A `global` singleton pattern ensures that active PTY sessions and tool states are preserved across backend reloads or worker transitions.

## 🧵 Concurrency & Multi-Session Behavior

PowerDirector is designed as a personal AI orchestrator. While it supports multiple simultaneous chat sessions via the Gateway, certain tools maintain global state to optimize resource usage.

- **Browser Tool**: Uses a single Puppeteer instance. While multi-tabbing is supported, concurrent high-impact browser operations across multiple sessions may lead to interaction conflicts.
- **PTY Shell**: Each PTY session is independent and isolated to its owner's chat session, preventing cross-session command leakage.
- **Skills**: Skills executed via the `SkillsManager` are spawned as independent subprocesses, ensuring isolation but sharing the host's global resources (CPU/Memory).

---

## ⚙️ Configuration

PowerDirector features a state-of-the-art configuration system accessible at `/config`. 

- **33 Dynamic Sections**: Environment, Agents, Models, Channels, Logging, Browser, Audio (TTS/STT), Media, Memory, Terminal, and more.
- **Setup Wizard**: Accessible at `/setup` for easy initial configuration.
- **Persistence**: Powered by a robust SQLite backend with Zod-validated JSON storage.

### Runtime-Wired Settings (Current)

These sections are currently enforced in live runtime paths (not UI-only):

- `env`: `shellEnv.enabled`, `customEnvVars`, and `dotenvPath` are applied to runtime subprocess environments (`shell` tool, `/bash`, CLI providers).
- `wizard`: setup wizard now uses `lastRunAt`, `lastRunVersion`, `lastRunCommand`, and `lastRunMode` to decide auto-skip vs re-run behavior (including `?force=1` override).
- `update`: startup update behavior now enforces `channel`, `checkOnStart`, and `autoInstall` via npm dist-tag checks with safe auto-install constraints.
- `auth`: profile-based credentials with ordered precedence are enforced for provider/tool/channel token resolution paths.
- `agents`: defaults now control runtime provider preference ordering, workspace path for file/shell tools, compaction profile behavior, run timeout, and gateway concurrency.
- `channels`: per-channel `enabled`, `dmPolicy`, `groupPolicy`, `allowFrom`, `guildIds`, `allowedChannelIds`, and `streamMode` are enforced in gateway message handling.
- `messages`: `messagePrefix`, `responsePrefix`, `groupChat`, `queue`, `inbound`, `ackReaction`, `ackReactionScope`, `removeAckAfterReply`, `suppressToolErrors`, and `tts` are enforced in gateway input/output handling.
- `commands`: `native`, `nativeSkills`, `text`, `bash`, `bashForegroundMs`, `config`, `debug`, `restart`, `useAccessGroups`, `ownerAllowFrom`, and `allowFrom` are enforced in command routing.
- `terminal`: `shell`, `autoTimeoutMinutes`, and `port` are enforced by terminal runtime. New sessions honor shell selection (`bash`/`zsh`), and idle timeout closes sessions only when the shell is truly idle at prompt (not while commands run or await input).
- `hooks`: internal hook entries are validated and executed by trigger, with enable/disable handling and safe skip behavior for invalid entries.
- `skills`: configured skills are discovered from `skills.entries`, per-skill enablement is enforced, and `/skill list` + `/skill run` execute skill runners with injected config/api key env.
- `tools`: `tools.web.search.*` and `tools.web.fetch.enabled` control web tool behavior; PowerDirector-style `tools.profile/allow/alsoAllow/deny` (global + per-agent) is enforced in live tool execution and `/tool` command paths, intersected with per-binding tool allowlists.
- `models`: provider model alias/default resolution, `maxTokens`, per-model `timeoutOverride`, per-model `rateLimit`, and CLI model settings are enforced in runtime execution paths.
- `gateway`: control server now enforces configured `port`, `mode`, `bind`, auth token mode, trusted proxy IP parsing, tailscale mode hooks, and response body size limits.
- `bindings`: channel bindings now enforce per-channel agent routing context, model hint, system prompt, and per-binding tool allowlists in runtime message handling.
- `agents.defaults.model`: `primary` and `fallbacks` build the **Default fallback chain** at startup. The gateway promotes `primary` to the initial model hint for all Default-mode requests; `fallbacks` are tried in order if it fails. An override selection from the UI dropdown is tried first, then the same chain is used if the override fails. After the chain is exhausted, a structured error with per-provider failure details is returned to the UI and displayed as a themed modal.
- `broadcast`: broadcast engine enforces `enabled`, destination list (`channelId:recipientId`), format normalization, retry count, and retry delay via `/broadcast`.
- `session`: `maxHistory`, `compactionThreshold`, `ttl`, `autoTitle`, `persistOnDisk`, and `exportFormat` are enforced by session manager and export API.
- `nodeHost`: node host server enforces `enabled`, `port`, `authToken`, `maxNodes`, `heartbeatInterval`, and `capabilities` across registration/health/heartbeat flows, plus real command transport (`POST /command`, `GET /commands/next`, `POST /commands/result`), mirrored Next API routes (`/api/nodes/command`, `/api/nodes/commands/next`, `/api/nodes/commands/result`), gateway dispatch via `/node run`, and a reference node worker (`bin/node-worker.ts`).
- `cron`: cron runtime enforces `enabled` and `jobs` from config, schedules them live, executes `message`/`command`/`webhook` actions, and stops jobs on gateway shutdown.
- `web`: dedicated web runtime enforces `enabled`, `port`, CORS allowlist, per-minute rate limiting, and static file serving from `staticDir`.
- `discovery`: discovery manager enforces `enabled`, `protocol`, `serviceName`, `advertise`, and `peers` with live peer probing and optional mDNS advertise startup.
- `canvasHost`: canvas host runtime enforces `enabled`, `url`, `authToken`, default dimensions, and tool allowlist through `/canvas status` and `/canvas open`.
- `meta`: configuration metadata (`lastTouchedVersion`, `lastTouchedAt`) is updated consistently on section update, import, and reset.
- `approvals`: policy engine enforces `mode`, `autoApprovePatterns`, `denyPatterns`, per-operation defaults, per-agent overrides, and timeout-backed approval flow (`/approvals`, `/approve`).
- `audio`: voice runtime enforces `audio.tts` and `audio.stt` settings (enablement, provider, model, language, voice, speed) in `voice` tool execution paths.
- `media`: media runtime enforces image generation defaults and upload constraints (`maxUploadSize`, `allowedMimeTypes`, `storageDir`) in image tool generation and gateway attachment validation.
- `diagnostics`: `enabled`, `flags`, `otel`, and `cacheTrace` control diagnostics lifecycle, scoped diagnostics signaling, OpenTelemetry export settings, and cache trace capture behavior.
- `logging`: `level`, `file`, `consoleLevel`, `consoleStyle`, `redactSensitive`, and `redactPatterns` are enforced by runtime logging behavior for file/console output and sensitive-value redaction.
- `browser`: browser runtime options (`enabled`, `evaluateEnabled`, `cdpUrl`, profile map, remote CDP timeouts, `color`, `headless`, `executablePath`, `noSandbox`, `attachOnly`, `defaultProfile`, and `snapshotDefaults`) are applied by browser tool runtime behavior.
- `ui`: `theme`, `fontSize`, `fontFamily`, `sidebarWidth`, `showTimestamps`, `showToolCalls`, `codeHighlighting`, `markdownRendering`, `maxSidebarChats`, `chatTabs`, and `maxChatTabs` are applied in chat/config UI runtime. The sidebar uses categorized navigation (Chat/Config sections), smooth CSS transitions for collapse/expand, a hamburger menu, and a fullscreen toggle. Native browser dialogs (alert/confirm/prompt) have been replaced with a custom theme-aware `Dialog` component.
- `memory`: memory runtime enforces backend selection (`sqlite`/`file`/`vector`), max entries, retention, auto-summarize behavior, and vector-provider safety checks; gateway captures user/assistant memory entries.
- `plugins`: plugin runtime enforces per-plugin enablement/config, module load behavior (`index.js` onLoad), and command execution (`/plugin list`, `/plugin run`).
- `talk`: talk mode runtime enforces `enabled`, `provider`, `apiKey`, `defaultVoice`, `defaultSpeed`, and `autoPlay` via `/talk status` and `/talk say`.


## 🛠️ Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router + Turbopack)
- **Language**: TypeScript
- **Validation**: [Zod](https://zod.dev/)
- **Database**: SQLite / Prisma
- **Real-time**: WebSockets & Platform-specific SDKs (whatsapp-web.js, discord.js, etc.)

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/petrafan007/powerdirector.git
cd powerdirector

# Install dependencies
npm install

# Build/Run the CLI
npm run build
DB_PATH=./powerdirector.db npm run start

# Run the web UI (separate Next.js app)
cd ui
npm install
npm run dev
```

Visit `http://localhost:4007/setup` to run the configuration wizard.

### Port Assignments

PowerDirector uses the following ports for its various components:

- **4007**: Web UI (Main interface)
- **4008**: Terminal WebSocket (Integrated terminal - now with robust conflict handling)
- **3012**: Gateway Control API (Background API service)
- **3013**: Web Runtime / Asset Server (Used for serving generated files)

### Cloudflare Tunnel

PowerDirector is configured to run behind a dedicated Cloudflare Tunnel on `powerdirector.example.com`.

- **Tunnel ID**: `[YOUR_TUNNEL_ID]`
- **Configuration**: `/home/user/.cloudflared/powerdirector.yml`
- **Systemd Service**: `cloudflared-powerdirector.service`

#### Ingress Rules
The tunnel uses path-based routing to support both the web UI and the terminal on a single hostname:
- `powerdirector.example.com/` -> `http://localhost:4007` (Web UI)
- `powerdirector.example.com/terminal-ws` -> `ws://localhost:4008` (Terminal WebSocket)

Note: `TerminalInterface.tsx` has been modified to automatically detect standard HTTPS/HTTP ports and use the `/terminal-ws` path for WebSocket connections.

### Reference Node Worker

PowerDirector includes a reference node worker script for the new node command transport:

```bash
# Start a worker against the direct node-host server (default mode)
npm run worker:node -- --token YOUR_NODE_TOKEN --node-id dev-node --capabilities shell --allow-shell
```

```bash
# Start a worker against Next.js API routes instead of the direct node-host port
npm run worker:node -- --api-mode next --base-url http://127.0.0.1:4007 --token YOUR_NODE_TOKEN --node-id dev-node
```

The worker:
- Registers itself (`/register` or `/api/nodes`)
- Sends periodic heartbeats
- Long-polls for commands
- Posts command results back to host

Built-in command handlers:
- `noop`
- `echo`
- `shell.exec` (disabled unless `--allow-shell` is set)

### Run Worker As A `systemd` Service

Template files are included:
- `deploy/systemd/powerdirector-node-worker.service`
- `deploy/systemd/powerdirector-node-worker.env.example`

Install steps (Linux):

```bash
sudo cp deploy/systemd/powerdirector-node-worker.service /etc/systemd/system/
sudo cp deploy/systemd/powerdirector-node-worker.env.example /etc/default/powerdirector-node-worker
sudo nano /etc/default/powerdirector-node-worker
sudo systemctl daemon-reload
sudo systemctl enable --now powerdirector-node-worker
```

Check status/logs:

```bash
systemctl status powerdirector-node-worker --no-pager
journalctl -u powerdirector-node-worker -n 100 --no-pager
```

Notes:
- Set `NODE_WORKER_TOKEN` in `/etc/default/powerdirector-node-worker`.
- If you run through Next.js API routes instead of the direct node-host port, set:
  - `NODE_WORKER_API_MODE=next`
  - `NODE_WORKER_BASE_URL=http://127.0.0.1:4007`
- Update `User`, `Group`, and `WorkingDirectory` in `deploy/systemd/powerdirector-node-worker.service` to match your host.

## 📝 Roadmap & Tasks

See [TASKS.md](TASKS.md) for current implementation status and upcoming features.

## 📜 License

MIT © 2026 petrafan007
