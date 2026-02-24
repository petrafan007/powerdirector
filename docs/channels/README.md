# PowerDirector Channels Architecture

This directory documents the channel architecture migration from OpenClaw to PowerDirector.

## Overview

PowerDirector uses a plugin-based channel architecture where each messaging platform (Telegram, Discord, Slack, etc.) is implemented as a full-featured channel with its own directory under `src/`.

## Architecture

### Channel Implementations (`src/X/`)

Each channel has its own dedicated directory containing the full implementation:

| Directory | Platform | Files |
|-----------|----------|-------|
| `src/telegram/` | Telegram Bot API | 79 files |
| `src/discord/` | Discord Gateway | 51 files |
| `src/signal/` | Signal (via signald) | 25 files |
| `src/slack/` | Slack Socket Mode | 45 files |
| `src/whatsapp/` | WhatsApp Web | 4 files |
| `src/imessage/` | iMessage (macOS) | 14 files |
| `src/line/` | LINE Messaging API | 41 files |

### Shared Utilities (`src/channels/`)

Shared channel utilities used by all implementations:

- `ack-reactions.ts` - Acknowledgment reaction helpers
- `allow-from.ts` - Allowlist utilities
- `channel-config.ts` - Channel configuration helpers
- `command-gating.ts` - Command authorization
- `dock.ts` - Channel docking (lifecycle hooks)
- `registry.ts` - Channel registry
- `session.ts` - Session utilities
- `typing.ts` - Typing indicators
- And more...

### Plugin System (`src/channels/plugins/`)

The plugin registry and loading system:

- `index.ts` - Plugin registry entry point
- `types.plugin.ts` - Plugin type definitions
- `load.ts` - Plugin loading
- `status.ts` - Channel status helpers
- `config-schema.ts` - Config schema definitions

### Gateway Integration (`src/gateway/`)

Channel lifecycle management:

- `server-channels.ts` - Channel manager (start/stop/restart)
- `server-methods/channels.ts` - Channel RPC methods
- `server-methods/send.ts` - Outbound message sending
- `server-methods/config.ts` - Config RPC methods

### UI Controllers/Views

- `ui/lib/controllers/` - Channel status loading
- `ui/app/views/` - Channel config forms and UI

## How Channels Work

### 1. Plugin Registration

Extensions in `extensions/` directory register their channel plugins:

```typescript
// extensions/telegram/index.ts
export default {
  id: 'telegram',
  name: 'Telegram',
  register(api) {
    api.registerChannel({
      plugin: telegramChannelPlugin,
      configSchema: telegramConfigSchema
    });
  }
};
```

### 2. Channel Loading

The plugin loader discovers and loads extensions:

```typescript
// src/plugins/loader.ts
const loader = createPluginLoader({ baseDir, extensionsDir });
await loader.loadAll();
```

### 3. Channel Manager

The channel manager handles lifecycle:

```typescript
// src/gateway/server-channels.ts
const manager = createChannelManager({ loadConfig, channelLogs });
await manager.startChannels();
```

### 4. Message Flow

```
User Message → Channel (telegram) → Gateway → Agent → Response → Channel → User
```

## Configuration

Channels are configured in `powerdirector.config.json`:

```json
{
  "channels": {
    "telegram": {
      "enabled": true,
      "botToken": "your-bot-token",
      "accounts": {
        "default": {
          "botToken": "account-specific-token"
        }
      }
    }
  }
}
```

## Adding a New Channel

1. Create implementation in `src/newchannel/`
2. Create extension in `extensions/newchannel/`
3. Add config schema in `src/channels/plugins/config-schema.ts`
4. Register in plugin loader

## Migration Notes

This architecture was migrated from OpenClaw to PowerDirector:

- All channel implementations copied from `openclaw-source/src/X/`
- All shared utilities copied from `openclaw-source/src/channels/`
- All plugin system files copied from `openclaw-source/src/channels/plugins/`
- All references updated from `openclaw` to `powerdirector`

## See Also

- [ClawHub Extension Refactor Plan](../../ClawHub_Extension_Refactor.md)
- [Channel Guide](../CHANNEL_GUIDE.md)