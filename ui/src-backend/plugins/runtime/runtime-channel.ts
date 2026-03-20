import { resolveEffectiveMessagesConfig, resolveHumanDelayConfig } from "../../agents/identity";
import {
  chunkByNewline,
  chunkMarkdownText,
  chunkMarkdownTextWithMode,
  chunkText,
  chunkTextWithMode,
  resolveChunkMode,
  resolveTextChunkLimit,
} from "../../auto-reply/chunk";
import {
  hasControlCommand,
  isControlCommandMessage,
  shouldComputeCommandAuthorized,
} from "../../auto-reply/command-detection";
import { shouldHandleTextCommands } from "../../auto-reply/commands-registry";
import { withReplyDispatcher } from "../../auto-reply/dispatch";
import {
  formatAgentEnvelope,
  formatInboundEnvelope,
  resolveEnvelopeFormatOptions,
} from "../../auto-reply/envelope";
import {
  createInboundDebouncer,
  resolveInboundDebounceMs,
} from "../../auto-reply/inbound-debounce";
import { dispatchReplyFromConfig } from "../../auto-reply/reply/dispatch-from-config";
import { finalizeInboundContext } from "../../auto-reply/reply/inbound-context";
import {
  buildMentionRegexes,
  matchesMentionPatterns,
  matchesMentionWithExplicit,
} from "../../auto-reply/reply/mentions";
import { dispatchReplyWithBufferedBlockDispatcher } from "../../auto-reply/reply/provider-dispatcher";
import { createReplyDispatcherWithTyping } from "../../auto-reply/reply/reply-dispatcher";
import { removeAckReactionAfterReply, shouldAckReaction } from "../../channels/ack-reactions";
import { resolveCommandAuthorizedFromAuthorizers } from "../../channels/command-gating";
import { recordInboundSession } from "../../channels/session";
import {
  resolveChannelGroupPolicy,
  resolveChannelGroupRequireMention,
} from "../../config/group-policy";
import { resolveMarkdownTableMode } from "../../config/markdown-tables";
import {
  readSessionUpdatedAt,
  recordSessionMetaFromInbound,
  resolveStorePath,
  updateLastRoute,
} from "../../config/sessions";
import { getChannelActivity, recordChannelActivity } from "../../infra/channel-activity";
import {
  listLineAccountIds,
  normalizeAccountId as normalizeLineAccountId,
  resolveDefaultLineAccountId,
  resolveLineAccount,
} from "../../line/accounts";
import { monitorLineProvider } from "../../line/monitor";
import { probeLineBot } from "../../line/probe";
import {
  createQuickReplyItems,
  pushFlexMessage,
  pushLocationMessage,
  pushMessageLine,
  pushMessagesLine,
  pushTemplateMessage,
  pushTextMessageWithQuickReplies,
  sendMessageLine,
} from "../../line/send";
import { buildTemplateMessageFromPayload } from "../../line/template-messages";
import { convertMarkdownTables } from "../../markdown/tables";
import { fetchRemoteMedia } from "../../media/fetch";
import { saveMediaBuffer } from "../../media/store";
import { buildPairingReply } from "../../pairing/pairing-messages";
import {
  readChannelAllowFromStore,
  upsertChannelPairingRequest,
} from "../../pairing/pairing-store";
import { buildAgentSessionKey, resolveAgentRoute } from "../../routing/resolve-route";
import { createRuntimeDiscord } from "./runtime-discord";
import { createRuntimeIMessage } from "./runtime-imessage";
import { createRuntimeSignal } from "./runtime-signal";
import { createRuntimeSlack } from "./runtime-slack";
import { createRuntimeTelegram } from "./runtime-telegram";
import { createRuntimeWhatsApp } from "./runtime-whatsapp";
import type { PluginRuntime } from "./types";

function defineCachedValue<T extends object, K extends PropertyKey>(
  target: T,
  key: K,
  create: () => unknown,
): void {
  let cached: unknown;
  let ready = false;
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    get() {
      if (!ready) {
        cached = create();
        ready = true;
      }
      return cached;
    },
  });
}

export function createRuntimeChannel(): PluginRuntime["channel"] {
  const channelRuntime = {
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
      withReplyDispatcher,
      finalizeInboundContext,
      formatAgentEnvelope,
      /** @deprecated Prefer `BodyForAgent` + structured user-context blocks (do not build plaintext envelopes for prompts). */
      formatInboundEnvelope,
      resolveEnvelopeFormatOptions,
    },
    routing: {
      buildAgentSessionKey,
      resolveAgentRoute,
    },
    pairing: {
      buildPairingReply,
      readAllowFromStore: ({ channel, accountId, env }) =>
        readChannelAllowFromStore(channel, env, accountId),
      upsertPairingRequest: ({ channel, id, accountId, meta, env, pairingAdapter }) =>
        upsertChannelPairingRequest({
          channel,
          id,
          accountId,
          meta,
          env,
          pairingAdapter,
        }),
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
  } satisfies Omit<
    PluginRuntime["channel"],
    "discord" | "slack" | "telegram" | "signal" | "imessage" | "whatsapp"
  > &
    Partial<
      Pick<
        PluginRuntime["channel"],
        "discord" | "slack" | "telegram" | "signal" | "imessage" | "whatsapp"
      >
    >;

  defineCachedValue(channelRuntime, "discord", createRuntimeDiscord);
  defineCachedValue(channelRuntime, "slack", createRuntimeSlack);
  defineCachedValue(channelRuntime, "telegram", createRuntimeTelegram);
  defineCachedValue(channelRuntime, "signal", createRuntimeSignal);
  defineCachedValue(channelRuntime, "imessage", createRuntimeIMessage);
  defineCachedValue(channelRuntime, "whatsapp", createRuntimeWhatsApp);

  return channelRuntime as PluginRuntime["channel"];
}
