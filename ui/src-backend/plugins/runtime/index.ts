import { createRequire } from "node:module";
import { resolveEffectiveMessagesConfig, resolveHumanDelayConfig } from '../../agents/identity';
import { createMemoryGetTool, createMemorySearchTool } from '../../agents/tools/memory-tool';
import { handleSlackAction } from '../../agents/tools/slack-actions';
import {
  chunkByNewline,
  chunkMarkdownText,
  chunkMarkdownTextWithMode,
  chunkText,
  chunkTextWithMode,
  resolveChunkMode,
  resolveTextChunkLimit,
} from '../../auto-reply/chunk';
import {
  hasControlCommand,
  isControlCommandMessage,
  shouldComputeCommandAuthorized,
} from '../../auto-reply/command-detection';
import { shouldHandleTextCommands } from '../../auto-reply/commands-registry';
import {
  formatAgentEnvelope,
  formatInboundEnvelope,
  resolveEnvelopeFormatOptions,
} from '../../auto-reply/envelope';
import {
  createInboundDebouncer,
  resolveInboundDebounceMs,
} from '../../auto-reply/inbound-debounce';
import { dispatchReplyFromConfig } from '../../auto-reply/reply/dispatch-from-config';
import { finalizeInboundContext } from '../../auto-reply/reply/inbound-context';
import {
  buildMentionRegexes,
  matchesMentionPatterns,
  matchesMentionWithExplicit,
} from '../../auto-reply/reply/mentions';
import { dispatchReplyWithBufferedBlockDispatcher } from '../../auto-reply/reply/provider-dispatcher';
import { createReplyDispatcherWithTyping } from '../../auto-reply/reply/reply-dispatcher';
import { removeAckReactionAfterReply, shouldAckReaction } from '../../channels/ack-reactions';
import { resolveCommandAuthorizedFromAuthorizers } from '../../channels/command-gating';
import { discordMessageActions } from '../../channels/plugins/actions/discord';
import { signalMessageActions } from '../../channels/plugins/actions/signal';
import { telegramMessageActions } from '../../channels/plugins/actions/telegram';
import { createWhatsAppLoginTool } from '../../channels/plugins/agent-tools/whatsapp-login';
import { recordInboundSession } from '../../channels/session';
import { registerMemoryCli } from '../../cli/memory-cli';
import { loadConfig, writeConfigFile } from '../../config/config';
import {
  resolveChannelGroupPolicy,
  resolveChannelGroupRequireMention,
} from '../../config/group-policy';
import { resolveMarkdownTableMode } from '../../config/markdown-tables';
import { resolveStateDir } from '../../config/paths';
import {
  readSessionUpdatedAt,
  recordSessionMetaFromInbound,
  resolveStorePath,
  updateLastRoute,
} from '../../config/sessions';
import { auditDiscordChannelPermissions } from '../../discord/audit';
import {
  listDiscordDirectoryGroupsLive,
  listDiscordDirectoryPeersLive,
} from '../../discord/directory-live';
import { monitorDiscordProvider } from '../../discord/monitor';
import { probeDiscord } from '../../discord/probe';
import { resolveDiscordChannelAllowlist } from '../../discord/resolve-channels';
import { resolveDiscordUserAllowlist } from '../../discord/resolve-users';
import { sendMessageDiscord, sendPollDiscord } from '../../discord/send';
import { shouldLogVerbose } from '../../globals';
import { monitorIMessageProvider } from '../../imessage/monitor';
import { probeIMessage } from '../../imessage/probe';
import { sendMessageIMessage } from '../../imessage/send';
import { getChannelActivity, recordChannelActivity } from '../../infra/channel-activity';
import { enqueueSystemEvent } from '../../infra/system-events';
import {
  listLineAccountIds,
  normalizeAccountId as normalizeLineAccountId,
  resolveDefaultLineAccountId,
  resolveLineAccount,
} from '../../line/accounts';
import { monitorLineProvider } from '../../line/monitor';
import { probeLineBot } from '../../line/probe';
import {
  createQuickReplyItems,
  pushMessageLine,
  pushMessagesLine,
  pushFlexMessage,
  pushTemplateMessage,
  pushLocationMessage,
  pushTextMessageWithQuickReplies,
  sendMessageLine,
} from '../../line/send';
import { buildTemplateMessageFromPayload } from '../../line/template-messages';
import { getChildLogger } from '../../logging';
import { normalizeLogLevel } from '../../logging/levels';
import { convertMarkdownTables } from '../../markdown/tables';
import { isVoiceCompatibleAudio } from '../../media/audio';
import { mediaKindFromMime } from '../../media/constants';
import { fetchRemoteMedia } from '../../media/fetch';
import { getImageMetadata, resizeToJpeg } from '../../media/image-ops';
import { detectMime } from '../../media/mime';
import { saveMediaBuffer } from '../../media/store';
import { buildPairingReply } from '../../pairing/pairing-messages';
import {
  readChannelAllowFromStore,
  upsertChannelPairingRequest,
} from '../../pairing/pairing-store';
import { runCommandWithTimeout } from '../../process/exec';
import { resolveAgentRoute } from '../../routing/resolve-route';
import { monitorSignalProvider } from '../../signal/index';
import { probeSignal } from '../../signal/probe';
import { sendMessageSignal } from '../../signal/send';
import {
  listSlackDirectoryGroupsLive,
  listSlackDirectoryPeersLive,
} from '../../slack/directory-live';
import { monitorSlackProvider } from '../../slack/index';
import { probeSlack } from '../../slack/probe';
import { resolveSlackChannelAllowlist } from '../../slack/resolve-channels';
import { resolveSlackUserAllowlist } from '../../slack/resolve-users';
import { sendMessageSlack } from '../../slack/send';
import {
  auditTelegramGroupMembership,
  collectTelegramUnmentionedGroupIds,
} from '../../telegram/audit';
import { monitorTelegramProvider } from '../../telegram/monitor';
import { probeTelegram } from '../../telegram/probe';
import { sendMessageTelegram, sendPollTelegram } from '../../telegram/send';
import { resolveTelegramToken } from '../../telegram/token';
import { textToSpeechTelephony } from '../../tts/tts';
import { getActiveWebListener } from '../../web/active-listener';
import {
  getWebAuthAgeMs,
  logoutWeb,
  logWebSelfId,
  readWebSelfId,
  webAuthExists,
} from '../../web/auth-store';
import { loadWebMedia } from '../../web/media';
import { formatNativeDependencyHint } from './native-deps';
import type { PluginRuntime } from './types';

let cachedVersion: string | null = null;

function resolveVersion(): string {
  if (cachedVersion) {
    return cachedVersion;
  }
  try {
    const require = createRequire(import.meta.url);
    const pkg = require("../../../package.json") as { version?: string };
    cachedVersion = pkg.version ?? "unknown";
    return cachedVersion;
  } catch {
    cachedVersion = "unknown";
    return cachedVersion;
  }
}

const sendMessageWhatsAppLazy: PluginRuntime["channel"]["whatsapp"]["sendMessageWhatsApp"] = async (
  ...args
) => {
  const { sendMessageWhatsApp } = await loadWebOutbound();
  return sendMessageWhatsApp(...args);
};

const sendPollWhatsAppLazy: PluginRuntime["channel"]["whatsapp"]["sendPollWhatsApp"] = async (
  ...args
) => {
  const { sendPollWhatsApp } = await loadWebOutbound();
  return sendPollWhatsApp(...args);
};

const loginWebLazy: PluginRuntime["channel"]["whatsapp"]["loginWeb"] = async (...args) => {
  const { loginWeb } = await loadWebLogin();
  return loginWeb(...args);
};

const startWebLoginWithQrLazy: PluginRuntime["channel"]["whatsapp"]["startWebLoginWithQr"] = async (
  ...args
) => {
  const { startWebLoginWithQr } = await loadWebLoginQr();
  return startWebLoginWithQr(...args);
};

const waitForWebLoginLazy: PluginRuntime["channel"]["whatsapp"]["waitForWebLogin"] = async (
  ...args
) => {
  const { waitForWebLogin } = await loadWebLoginQr();
  return waitForWebLogin(...args);
};

const monitorWebChannelLazy: PluginRuntime["channel"]["whatsapp"]["monitorWebChannel"] = async (
  ...args
) => {
  const { monitorWebChannel } = await loadWebChannel();
  return monitorWebChannel(...args);
};

const handleWhatsAppActionLazy: PluginRuntime["channel"]["whatsapp"]["handleWhatsAppAction"] =
  async (...args) => {
    const { handleWhatsAppAction } = await loadWhatsAppActions();
    return handleWhatsAppAction(...args);
  };

let webOutboundPromise: Promise<typeof import('../../web/outbound')> | null = null;
let webLoginPromise: Promise<typeof import('../../web/login')> | null = null;
let webLoginQrPromise: Promise<typeof import('../../web/login-qr')> | null = null;
let webChannelPromise: Promise<typeof import('../../channels/web/index')> | null = null;
let whatsappActionsPromise: Promise<
  typeof import('../../agents/tools/whatsapp-actions')
> | null = null;

function loadWebOutbound() {
  webOutboundPromise ??= import('../../web/outbound');
  return webOutboundPromise;
}

function loadWebLogin() {
  webLoginPromise ??= import('../../web/login');
  return webLoginPromise;
}

function loadWebLoginQr() {
  webLoginQrPromise ??= import('../../web/login-qr');
  return webLoginQrPromise;
}

function loadWebChannel() {
  webChannelPromise ??= import('../../channels/web/index');
  return webChannelPromise;
}

function loadWhatsAppActions() {
  whatsappActionsPromise ??= import('../../agents/tools/whatsapp-actions');
  return whatsappActionsPromise;
}

export function createPluginRuntime(): PluginRuntime {
  return {
    version: resolveVersion(),
    config: createRuntimeConfig(),
    system: createRuntimeSystem(),
    media: createRuntimeMedia(),
    tts: { textToSpeechTelephony },
    tools: createRuntimeTools(),
    channel: createRuntimeChannel(),
    logging: createRuntimeLogging(),
    state: { resolveStateDir },
  };
}

function createRuntimeConfig(): PluginRuntime["config"] {
  return {
    loadConfig,
    writeConfigFile,
  };
}

function createRuntimeSystem(): PluginRuntime["system"] {
  return {
    enqueueSystemEvent,
    runCommandWithTimeout,
    formatNativeDependencyHint,
  };
}

function createRuntimeMedia(): PluginRuntime["media"] {
  return {
    loadWebMedia,
    detectMime,
    mediaKindFromMime,
    isVoiceCompatibleAudio,
    getImageMetadata,
    resizeToJpeg,
  };
}

function createRuntimeTools(): PluginRuntime["tools"] {
  return {
    createMemoryGetTool,
    createMemorySearchTool,
    registerMemoryCli,
  };
}

function createRuntimeChannel(): PluginRuntime["channel"] {
  return {
    text: {
      chunkByNewline,
      chunkMarkdownText,
      chunkMarkdownTextWithMode,
      chunkText,
      chunkTextWithMode,
      resolveChunkMode,
      resolveTextChunkLimit,
      hasControlCommand,
      resolveMarkdownTableMode,
      convertMarkdownTables,
    },
    reply: {
      dispatchReplyWithBufferedBlockDispatcher,
      createReplyDispatcherWithTyping,
      resolveEffectiveMessagesConfig,
      resolveHumanDelayConfig,
      dispatchReplyFromConfig,
      finalizeInboundContext,
      formatAgentEnvelope,
      /** @deprecated Prefer `BodyForAgent` + structured user-context blocks (do not build plaintext envelopes for prompts). */
      formatInboundEnvelope,
      resolveEnvelopeFormatOptions,
    },
    routing: {
      resolveAgentRoute,
    },
    pairing: {
      buildPairingReply,
      readAllowFromStore: readChannelAllowFromStore,
      upsertPairingRequest: upsertChannelPairingRequest,
    },
    media: {
      fetchRemoteMedia,
      saveMediaBuffer,
    },
    activity: {
      record: recordChannelActivity,
      get: getChannelActivity,
    },
    session: {
      resolveStorePath,
      readSessionUpdatedAt,
      recordSessionMetaFromInbound,
      recordInboundSession,
      updateLastRoute,
    },
    mentions: {
      buildMentionRegexes,
      matchesMentionPatterns,
      matchesMentionWithExplicit,
    },
    reactions: {
      shouldAckReaction,
      removeAckReactionAfterReply,
    },
    groups: {
      resolveGroupPolicy: resolveChannelGroupPolicy,
      resolveRequireMention: resolveChannelGroupRequireMention,
    },
    debounce: {
      createInboundDebouncer,
      resolveInboundDebounceMs,
    },
    commands: {
      resolveCommandAuthorizedFromAuthorizers,
      isControlCommandMessage,
      shouldComputeCommandAuthorized,
      shouldHandleTextCommands,
    },
    discord: {
      messageActions: discordMessageActions,
      auditChannelPermissions: auditDiscordChannelPermissions,
      listDirectoryGroupsLive: listDiscordDirectoryGroupsLive,
      listDirectoryPeersLive: listDiscordDirectoryPeersLive,
      probeDiscord,
      resolveChannelAllowlist: resolveDiscordChannelAllowlist,
      resolveUserAllowlist: resolveDiscordUserAllowlist,
      sendMessageDiscord,
      sendPollDiscord,
      monitorDiscordProvider,
    },
    slack: {
      listDirectoryGroupsLive: listSlackDirectoryGroupsLive,
      listDirectoryPeersLive: listSlackDirectoryPeersLive,
      probeSlack,
      resolveChannelAllowlist: resolveSlackChannelAllowlist,
      resolveUserAllowlist: resolveSlackUserAllowlist,
      sendMessageSlack,
      monitorSlackProvider,
      handleSlackAction,
    },
    telegram: {
      auditGroupMembership: auditTelegramGroupMembership,
      collectUnmentionedGroupIds: collectTelegramUnmentionedGroupIds,
      probeTelegram,
      resolveTelegramToken,
      sendMessageTelegram,
      sendPollTelegram,
      monitorTelegramProvider,
      messageActions: telegramMessageActions,
    },
    signal: {
      probeSignal,
      sendMessageSignal,
      monitorSignalProvider,
      messageActions: signalMessageActions,
    },
    imessage: {
      monitorIMessageProvider,
      probeIMessage,
      sendMessageIMessage,
    },
    whatsapp: {
      getActiveWebListener,
      getWebAuthAgeMs,
      logoutWeb,
      logWebSelfId,
      readWebSelfId,
      webAuthExists,
      sendMessageWhatsApp: sendMessageWhatsAppLazy,
      sendPollWhatsApp: sendPollWhatsAppLazy,
      loginWeb: loginWebLazy,
      startWebLoginWithQr: startWebLoginWithQrLazy,
      waitForWebLogin: waitForWebLoginLazy,
      monitorWebChannel: monitorWebChannelLazy,
      handleWhatsAppAction: handleWhatsAppActionLazy,
      createLoginTool: createWhatsAppLoginTool,
    },
    line: {
      listLineAccountIds,
      resolveDefaultLineAccountId,
      resolveLineAccount,
      normalizeAccountId: normalizeLineAccountId,
      probeLineBot,
      sendMessageLine,
      pushMessageLine,
      pushMessagesLine,
      pushFlexMessage,
      pushTemplateMessage,
      pushLocationMessage,
      pushTextMessageWithQuickReplies,
      createQuickReplyItems,
      buildTemplateMessageFromPayload,
      monitorLineProvider,
    },
  };
}

function createRuntimeLogging(): PluginRuntime["logging"] {
  return {
    shouldLogVerbose,
    getChildLogger: (bindings, opts) => {
      const logger = getChildLogger(bindings, {
        level: opts?.level ? normalizeLogLevel(opts.level) : undefined,
      });
      return {
        debug: (message) => logger.debug?.(message),
        info: (message) => logger.info(message),
        warn: (message) => logger.warn(message),
        error: (message) => logger.error(message),
      };
    },
  };
}

export type { PluginRuntime } from './types';
