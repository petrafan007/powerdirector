/**
 * Runtime helpers for native channel plugins.
 *
 * This surface exposes core and channel-specific helpers used by bundled
 * plugins. Prefer hooks unless you need tight in-process coupling with the
 * PowerDirector messaging/runtime stack.
 */
type ReadChannelAllowFromStore =
  typeof import("../../pairing/pairing-store").readChannelAllowFromStore;
type UpsertChannelPairingRequest =
  typeof import("../../pairing/pairing-store").upsertChannelPairingRequest;

type ReadChannelAllowFromStoreForAccount = (params: {
  channel: Parameters<ReadChannelAllowFromStore>[0];
  accountId: string;
  env?: Parameters<ReadChannelAllowFromStore>[1];
}) => ReturnType<ReadChannelAllowFromStore>;

type UpsertChannelPairingRequestForAccount = (
  params: Omit<Parameters<UpsertChannelPairingRequest>[0], "accountId"> & { accountId: string },
) => ReturnType<UpsertChannelPairingRequest>;

export type PluginRuntimeChannel = {
  text: {
    chunkByNewline: typeof import("../../auto-reply/chunk").chunkByNewline;
    chunkMarkdownText: typeof import("../../auto-reply/chunk").chunkMarkdownText;
    chunkMarkdownTextWithMode: typeof import("../../auto-reply/chunk").chunkMarkdownTextWithMode;
    chunkText: typeof import("../../auto-reply/chunk").chunkText;
    chunkTextWithMode: typeof import("../../auto-reply/chunk").chunkTextWithMode;
    resolveChunkMode: typeof import("../../auto-reply/chunk").resolveChunkMode;
    resolveTextChunkLimit: typeof import("../../auto-reply/chunk").resolveTextChunkLimit;
    hasControlCommand: typeof import("../../auto-reply/command-detection").hasControlCommand;
    resolveMarkdownTableMode: typeof import("../../config/markdown-tables").resolveMarkdownTableMode;
    convertMarkdownTables: typeof import("../../markdown/tables").convertMarkdownTables;
  };
  reply: {
    dispatchReplyWithBufferedBlockDispatcher: typeof import("../../auto-reply/reply/provider-dispatcher").dispatchReplyWithBufferedBlockDispatcher;
    createReplyDispatcherWithTyping: typeof import("../../auto-reply/reply/reply-dispatcher").createReplyDispatcherWithTyping;
    resolveEffectiveMessagesConfig: typeof import("../../agents/identity").resolveEffectiveMessagesConfig;
    resolveHumanDelayConfig: typeof import("../../agents/identity").resolveHumanDelayConfig;
    dispatchReplyFromConfig: typeof import("../../auto-reply/reply/dispatch-from-config").dispatchReplyFromConfig;
    withReplyDispatcher: typeof import("../../auto-reply/dispatch").withReplyDispatcher;
    finalizeInboundContext: typeof import("../../auto-reply/reply/inbound-context").finalizeInboundContext;
    formatAgentEnvelope: typeof import("../../auto-reply/envelope").formatAgentEnvelope;
    /** @deprecated Prefer `BodyForAgent` + structured user-context blocks (do not build plaintext envelopes for prompts). */
    formatInboundEnvelope: typeof import("../../auto-reply/envelope").formatInboundEnvelope;
    resolveEnvelopeFormatOptions: typeof import("../../auto-reply/envelope").resolveEnvelopeFormatOptions;
  };
  routing: {
    buildAgentSessionKey: typeof import("../../routing/resolve-route").buildAgentSessionKey;
    resolveAgentRoute: typeof import("../../routing/resolve-route").resolveAgentRoute;
  };
  pairing: {
    buildPairingReply: typeof import("../../pairing/pairing-messages").buildPairingReply;
    readAllowFromStore: ReadChannelAllowFromStoreForAccount;
    upsertPairingRequest: UpsertChannelPairingRequestForAccount;
  };
  media: {
    fetchRemoteMedia: typeof import("../../media/fetch").fetchRemoteMedia;
    saveMediaBuffer: typeof import("../../media/store").saveMediaBuffer;
  };
  activity: {
    record: typeof import("../../infra/channel-activity").recordChannelActivity;
    get: typeof import("../../infra/channel-activity").getChannelActivity;
  };
  session: {
    resolveStorePath: typeof import("../../config/sessions").resolveStorePath;
    readSessionUpdatedAt: typeof import("../../config/sessions").readSessionUpdatedAt;
    recordSessionMetaFromInbound: typeof import("../../config/sessions").recordSessionMetaFromInbound;
    recordInboundSession: typeof import("../../channels/session").recordInboundSession;
    updateLastRoute: typeof import("../../config/sessions").updateLastRoute;
  };
  mentions: {
    buildMentionRegexes: typeof import("../../auto-reply/reply/mentions").buildMentionRegexes;
    matchesMentionPatterns: typeof import("../../auto-reply/reply/mentions").matchesMentionPatterns;
    matchesMentionWithExplicit: typeof import("../../auto-reply/reply/mentions").matchesMentionWithExplicit;
  };
  reactions: {
    shouldAckReaction: typeof import("../../channels/ack-reactions").shouldAckReaction;
    removeAckReactionAfterReply: typeof import("../../channels/ack-reactions").removeAckReactionAfterReply;
  };
  groups: {
    resolveGroupPolicy: typeof import("../../config/group-policy").resolveChannelGroupPolicy;
    resolveRequireMention: typeof import("../../config/group-policy").resolveChannelGroupRequireMention;
  };
  debounce: {
    createInboundDebouncer: typeof import("../../auto-reply/inbound-debounce").createInboundDebouncer;
    resolveInboundDebounceMs: typeof import("../../auto-reply/inbound-debounce").resolveInboundDebounceMs;
  };
  commands: {
    resolveCommandAuthorizedFromAuthorizers: typeof import("../../channels/command-gating").resolveCommandAuthorizedFromAuthorizers;
    isControlCommandMessage: typeof import("../../auto-reply/command-detection").isControlCommandMessage;
    shouldComputeCommandAuthorized: typeof import("../../auto-reply/command-detection").shouldComputeCommandAuthorized;
    shouldHandleTextCommands: typeof import("../../auto-reply/commands-registry").shouldHandleTextCommands;
  };
  discord: {
    messageActions: typeof import("@/src-backend/extensions/discord/runtime-api").discordMessageActions;
    auditChannelPermissions: typeof import("@/src-backend/extensions/discord/runtime-api").auditDiscordChannelPermissions;
    listDirectoryGroupsLive: typeof import("@/src-backend/extensions/discord/runtime-api").listDiscordDirectoryGroupsLive;
    listDirectoryPeersLive: typeof import("@/src-backend/extensions/discord/runtime-api").listDiscordDirectoryPeersLive;
    probeDiscord: typeof import("@/src-backend/extensions/discord/runtime-api").probeDiscord;
    resolveChannelAllowlist: typeof import("@/src-backend/extensions/discord/runtime-api").resolveDiscordChannelAllowlist;
    resolveUserAllowlist: typeof import("@/src-backend/extensions/discord/runtime-api").resolveDiscordUserAllowlist;
    sendComponentMessage: typeof import("@/src-backend/extensions/discord/runtime-api").sendDiscordComponentMessage;
    sendMessageDiscord: typeof import("@/src-backend/extensions/discord/runtime-api").sendMessageDiscord;
    sendPollDiscord: typeof import("@/src-backend/extensions/discord/runtime-api").sendPollDiscord;
    monitorDiscordProvider: typeof import("@/src-backend/extensions/discord/runtime-api").monitorDiscordProvider;
    threadBindings: {
      getManager: typeof import("@/src-backend/extensions/discord/runtime-api").getThreadBindingManager;
      resolveIdleTimeoutMs: typeof import("@/src-backend/extensions/discord/runtime-api").resolveThreadBindingIdleTimeoutMs;
      resolveInactivityExpiresAt: typeof import("@/src-backend/extensions/discord/runtime-api").resolveThreadBindingInactivityExpiresAt;
      resolveMaxAgeMs: typeof import("@/src-backend/extensions/discord/runtime-api").resolveThreadBindingMaxAgeMs;
      resolveMaxAgeExpiresAt: typeof import("@/src-backend/extensions/discord/runtime-api").resolveThreadBindingMaxAgeExpiresAt;
      setIdleTimeoutBySessionKey: typeof import("@/src-backend/extensions/discord/runtime-api").setThreadBindingIdleTimeoutBySessionKey;
      setMaxAgeBySessionKey: typeof import("@/src-backend/extensions/discord/runtime-api").setThreadBindingMaxAgeBySessionKey;
      unbindBySessionKey: typeof import("@/src-backend/extensions/discord/runtime-api").unbindThreadBindingsBySessionKey;
    };
    typing: {
      pulse: typeof import("@/src-backend/extensions/discord/runtime-api").sendTypingDiscord;
      start: (params: {
        channelId: string;
        accountId?: string;
        cfg?: ReturnType<typeof import("../../config/config").loadConfig>;
        intervalMs?: number;
      }) => Promise<{
        refresh: () => Promise<void>;
        stop: () => void;
      }>;
    };
    conversationActions: {
      editMessage: typeof import("@/src-backend/extensions/discord/runtime-api").editMessageDiscord;
      deleteMessage: typeof import("@/src-backend/extensions/discord/runtime-api").deleteMessageDiscord;
      pinMessage: typeof import("@/src-backend/extensions/discord/runtime-api").pinMessageDiscord;
      unpinMessage: typeof import("@/src-backend/extensions/discord/runtime-api").unpinMessageDiscord;
      createThread: typeof import("@/src-backend/extensions/discord/runtime-api").createThreadDiscord;
      editChannel: typeof import("@/src-backend/extensions/discord/runtime-api").editChannelDiscord;
    };
  };
  slack: {
    listDirectoryGroupsLive: typeof import("@/src-backend/extensions/slack/runtime-api").listSlackDirectoryGroupsLive;
    listDirectoryPeersLive: typeof import("@/src-backend/extensions/slack/runtime-api").listSlackDirectoryPeersLive;
    probeSlack: typeof import("@/src-backend/extensions/slack/runtime-api").probeSlack;
    resolveChannelAllowlist: typeof import("@/src-backend/extensions/slack/runtime-api").resolveSlackChannelAllowlist;
    resolveUserAllowlist: typeof import("@/src-backend/extensions/slack/runtime-api").resolveSlackUserAllowlist;
    sendMessageSlack: typeof import("@/src-backend/extensions/slack/runtime-api").sendMessageSlack;
    monitorSlackProvider: typeof import("@/src-backend/extensions/slack/runtime-api").monitorSlackProvider;
    handleSlackAction: typeof import("@/src-backend/extensions/slack/runtime-api").handleSlackAction;
  };
  telegram: {
    auditGroupMembership: typeof import("@/src-backend/extensions/telegram/runtime-api").auditTelegramGroupMembership;
    collectUnmentionedGroupIds: typeof import("@/src-backend/extensions/telegram/runtime-api").collectTelegramUnmentionedGroupIds;
    probeTelegram: typeof import("@/src-backend/extensions/telegram/runtime-api").probeTelegram;
    resolveTelegramToken: typeof import("@/src-backend/extensions/telegram/runtime-api").resolveTelegramToken;
    sendMessageTelegram: typeof import("@/src-backend/extensions/telegram/runtime-api").sendMessageTelegram;
    sendPollTelegram: typeof import("@/src-backend/extensions/telegram/runtime-api").sendPollTelegram;
    monitorTelegramProvider: typeof import("@/src-backend/extensions/telegram/runtime-api").monitorTelegramProvider;
    messageActions: typeof import("@/src-backend/extensions/telegram/runtime-api").telegramMessageActions;
    threadBindings: {
      setIdleTimeoutBySessionKey: typeof import("@/src-backend/extensions/telegram/runtime-api").setTelegramThreadBindingIdleTimeoutBySessionKey;
      setMaxAgeBySessionKey: typeof import("@/src-backend/extensions/telegram/runtime-api").setTelegramThreadBindingMaxAgeBySessionKey;
    };
    typing: {
      pulse: typeof import("@/src-backend/extensions/telegram/runtime-api").sendTypingTelegram;
      start: (params: {
        to: string;
        accountId?: string;
        cfg?: ReturnType<typeof import("../../config/config").loadConfig>;
        intervalMs?: number;
        messageThreadId?: number;
      }) => Promise<{
        refresh: () => Promise<void>;
        stop: () => void;
      }>;
    };
    conversationActions: {
      editMessage: typeof import("@/src-backend/extensions/telegram/runtime-api").editMessageTelegram;
      editReplyMarkup: typeof import("@/src-backend/extensions/telegram/runtime-api").editMessageReplyMarkupTelegram;
      clearReplyMarkup: (
        chatIdInput: string | number,
        messageIdInput: string | number,
        opts?: {
          token?: string;
          accountId?: string;
          verbose?: boolean;
          api?: Partial<import("grammy").Bot["api"]>;
          retry?: import("../../infra/retry").RetryConfig;
          cfg?: ReturnType<typeof import("../../config/config").loadConfig>;
        },
      ) => Promise<{ ok: true; messageId: string; chatId: string }>;
      deleteMessage: typeof import("@/src-backend/extensions/telegram/runtime-api").deleteMessageTelegram;
      renameTopic: typeof import("@/src-backend/extensions/telegram/runtime-api").renameForumTopicTelegram;
      pinMessage: typeof import("@/src-backend/extensions/telegram/runtime-api").pinMessageTelegram;
      unpinMessage: typeof import("@/src-backend/extensions/telegram/runtime-api").unpinMessageTelegram;
    };
  };
  signal: {
    probeSignal: typeof import("@/src-backend/extensions/signal/runtime-api").probeSignal;
    sendMessageSignal: typeof import("@/src-backend/extensions/signal/runtime-api").sendMessageSignal;
    monitorSignalProvider: typeof import("@/src-backend/extensions/signal/runtime-api").monitorSignalProvider;
    messageActions: typeof import("@/src-backend/extensions/signal/runtime-api").signalMessageActions;
  };
  imessage: {
    monitorIMessageProvider: typeof import("@/src-backend/extensions/imessage/runtime-api").monitorIMessageProvider;
    probeIMessage: typeof import("@/src-backend/extensions/imessage/runtime-api").probeIMessage;
    sendMessageIMessage: typeof import("@/src-backend/extensions/imessage/runtime-api").sendMessageIMessage;
  };
  whatsapp: {
    getActiveWebListener: typeof import("./runtime-whatsapp-boundary").getActiveWebListener;
    getWebAuthAgeMs: typeof import("./runtime-whatsapp-boundary").getWebAuthAgeMs;
    logoutWeb: typeof import("./runtime-whatsapp-boundary").logoutWeb;
    logWebSelfId: typeof import("./runtime-whatsapp-boundary").logWebSelfId;
    readWebSelfId: typeof import("./runtime-whatsapp-boundary").readWebSelfId;
    webAuthExists: typeof import("./runtime-whatsapp-boundary").webAuthExists;
    sendMessageWhatsApp: typeof import("./runtime-whatsapp-boundary").sendMessageWhatsApp;
    sendPollWhatsApp: typeof import("./runtime-whatsapp-boundary").sendPollWhatsApp;
    loginWeb: typeof import("./runtime-whatsapp-boundary").loginWeb;
    startWebLoginWithQr: typeof import("./runtime-whatsapp-boundary").startWebLoginWithQr;
    waitForWebLogin: typeof import("./runtime-whatsapp-boundary").waitForWebLogin;
    monitorWebChannel: typeof import("./runtime-whatsapp-boundary").monitorWebChannel;
    handleWhatsAppAction: typeof import("./runtime-whatsapp-boundary").handleWhatsAppAction;
    createLoginTool: typeof import("./runtime-whatsapp-login-tool").createRuntimeWhatsAppLoginTool;
  };
  line: {
    listLineAccountIds: typeof import("../../line/accounts").listLineAccountIds;
    resolveDefaultLineAccountId: typeof import("../../line/accounts").resolveDefaultLineAccountId;
    resolveLineAccount: typeof import("../../line/accounts").resolveLineAccount;
    normalizeAccountId: typeof import("../../line/accounts").normalizeAccountId;
    probeLineBot: typeof import("../../line/probe").probeLineBot;
    sendMessageLine: typeof import("../../line/send").sendMessageLine;
    pushMessageLine: typeof import("../../line/send").pushMessageLine;
    pushMessagesLine: typeof import("../../line/send").pushMessagesLine;
    pushFlexMessage: typeof import("../../line/send").pushFlexMessage;
    pushTemplateMessage: typeof import("../../line/send").pushTemplateMessage;
    pushLocationMessage: typeof import("../../line/send").pushLocationMessage;
    pushTextMessageWithQuickReplies: typeof import("../../line/send").pushTextMessageWithQuickReplies;
    createQuickReplyItems: typeof import("../../line/send").createQuickReplyItems;
    buildTemplateMessageFromPayload: typeof import("../../line/template-messages").buildTemplateMessageFromPayload;
    monitorLineProvider: typeof import("../../line/monitor").monitorLineProvider;
  };
};
