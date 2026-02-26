import type { LogLevel } from '../../logging/levels';

type ShouldLogVerbose = typeof import('../../globals').shouldLogVerbose;
type DispatchReplyWithBufferedBlockDispatcher =
  typeof import('../../auto-reply/reply/provider-dispatcher').dispatchReplyWithBufferedBlockDispatcher;
type CreateReplyDispatcherWithTyping =
  typeof import('../../auto-reply/reply/reply-dispatcher').createReplyDispatcherWithTyping;
type ResolveEffectiveMessagesConfig =
  typeof import('../../agents/identity').resolveEffectiveMessagesConfig;
type ResolveHumanDelayConfig = typeof import('../../agents/identity').resolveHumanDelayConfig;
type ResolveAgentRoute = typeof import('../../routing/resolve-route').resolveAgentRoute;
type BuildPairingReply = typeof import('../../pairing/pairing-messages').buildPairingReply;
type ReadChannelAllowFromStore =
  typeof import('../../pairing/pairing-store').readChannelAllowFromStore;
type UpsertChannelPairingRequest =
  typeof import('../../pairing/pairing-store').upsertChannelPairingRequest;
type FetchRemoteMedia = typeof import('../../media/fetch').fetchRemoteMedia;
type SaveMediaBuffer = typeof import('../../media/store').saveMediaBuffer;
type TextToSpeechTelephony = typeof import('../../tts/tts').textToSpeechTelephony;
type BuildMentionRegexes = typeof import('../../auto-reply/reply/mentions').buildMentionRegexes;
type MatchesMentionPatterns =
  typeof import('../../auto-reply/reply/mentions').matchesMentionPatterns;
type MatchesMentionWithExplicit =
  typeof import('../../auto-reply/reply/mentions').matchesMentionWithExplicit;
type ShouldAckReaction = typeof import('../../channels/ack-reactions').shouldAckReaction;
type RemoveAckReactionAfterReply =
  typeof import('../../channels/ack-reactions').removeAckReactionAfterReply;
type ResolveChannelGroupPolicy =
  typeof import('../../config/group-policy').resolveChannelGroupPolicy;
type ResolveChannelGroupRequireMention =
  typeof import('../../config/group-policy').resolveChannelGroupRequireMention;
type CreateInboundDebouncer =
  typeof import('../../auto-reply/inbound-debounce').createInboundDebouncer;
type ResolveInboundDebounceMs =
  typeof import('../../auto-reply/inbound-debounce').resolveInboundDebounceMs;
type ResolveCommandAuthorizedFromAuthorizers =
  typeof import('../../channels/command-gating').resolveCommandAuthorizedFromAuthorizers;
type ResolveTextChunkLimit = typeof import('../../auto-reply/chunk').resolveTextChunkLimit;
type ResolveChunkMode = typeof import('../../auto-reply/chunk').resolveChunkMode;
type ChunkMarkdownText = typeof import('../../auto-reply/chunk').chunkMarkdownText;
type ChunkMarkdownTextWithMode =
  typeof import('../../auto-reply/chunk').chunkMarkdownTextWithMode;
type ChunkText = typeof import('../../auto-reply/chunk').chunkText;
type ChunkTextWithMode = typeof import('../../auto-reply/chunk').chunkTextWithMode;
type ChunkByNewline = typeof import('../../auto-reply/chunk').chunkByNewline;
type ResolveMarkdownTableMode =
  typeof import('../../config/markdown-tables').resolveMarkdownTableMode;
type ConvertMarkdownTables = typeof import('../../markdown/tables').convertMarkdownTables;
type HasControlCommand = typeof import('../../auto-reply/command-detection').hasControlCommand;
type IsControlCommandMessage =
  typeof import('../../auto-reply/command-detection').isControlCommandMessage;
type ShouldComputeCommandAuthorized =
  typeof import('../../auto-reply/command-detection').shouldComputeCommandAuthorized;
type ShouldHandleTextCommands =
  typeof import('../../auto-reply/commands-registry').shouldHandleTextCommands;
type DispatchReplyFromConfig =
  typeof import('../../auto-reply/reply/dispatch-from-config').dispatchReplyFromConfig;
type FinalizeInboundContext =
  typeof import('../../auto-reply/reply/inbound-context').finalizeInboundContext;
type FormatAgentEnvelope = typeof import('../../auto-reply/envelope').formatAgentEnvelope;
type FormatInboundEnvelope = typeof import('../../auto-reply/envelope').formatInboundEnvelope;
type ResolveEnvelopeFormatOptions =
  typeof import('../../auto-reply/envelope').resolveEnvelopeFormatOptions;
type ResolveStateDir = typeof import('../../config/paths').resolveStateDir;
type RecordInboundSession = typeof import('../../channels/session').recordInboundSession;
type RecordSessionMetaFromInbound =
  typeof import('../../config/sessions').recordSessionMetaFromInbound;
type ResolveStorePath = typeof import('../../config/sessions').resolveStorePath;
type ReadSessionUpdatedAt = typeof import('../../config/sessions').readSessionUpdatedAt;
type UpdateLastRoute = typeof import('../../config/sessions').updateLastRoute;
type LoadConfig = typeof import('../../config/config').loadConfig;
type WriteConfigFile = typeof import('../../config/config').writeConfigFile;
type RecordChannelActivity = typeof import('../../infra/channel-activity').recordChannelActivity;
type GetChannelActivity = typeof import('../../infra/channel-activity').getChannelActivity;
type EnqueueSystemEvent = typeof import('../../infra/system-events').enqueueSystemEvent;
type RunCommandWithTimeout = typeof import('../../process/exec').runCommandWithTimeout;
type FormatNativeDependencyHint = typeof import('./native-deps').formatNativeDependencyHint;
type LoadWebMedia = typeof import('../../web/media').loadWebMedia;
type DetectMime = typeof import('../../media/mime').detectMime;
type MediaKindFromMime = typeof import('../../media/constants').mediaKindFromMime;
type IsVoiceCompatibleAudio = typeof import('../../media/audio').isVoiceCompatibleAudio;
type GetImageMetadata = typeof import('../../media/image-ops').getImageMetadata;
type ResizeToJpeg = typeof import('../../media/image-ops').resizeToJpeg;
type CreateMemoryGetTool = typeof import('../../agents/tools/memory-tool').createMemoryGetTool;
type CreateMemorySearchTool =
  typeof import('../../agents/tools/memory-tool').createMemorySearchTool;
type RegisterMemoryCli = typeof import('../../cli/memory-cli').registerMemoryCli;
type DiscordMessageActions =
  typeof import('../../channels/plugins/actions/discord').discordMessageActions;
type AuditDiscordChannelPermissions =
  typeof import('../../discord/audit').auditDiscordChannelPermissions;
type ListDiscordDirectoryGroupsLive =
  typeof import('../../discord/directory-live').listDiscordDirectoryGroupsLive;
type ListDiscordDirectoryPeersLive =
  typeof import('../../discord/directory-live').listDiscordDirectoryPeersLive;
type ProbeDiscord = typeof import('../../discord/probe').probeDiscord;
type ResolveDiscordChannelAllowlist =
  typeof import('../../discord/resolve-channels').resolveDiscordChannelAllowlist;
type ResolveDiscordUserAllowlist =
  typeof import('../../discord/resolve-users').resolveDiscordUserAllowlist;
type SendMessageDiscord = typeof import('../../discord/send').sendMessageDiscord;
type SendPollDiscord = typeof import('../../discord/send').sendPollDiscord;
type MonitorDiscordProvider = typeof import('../../discord/monitor').monitorDiscordProvider;
type ListSlackDirectoryGroupsLive =
  typeof import('../../slack/directory-live').listSlackDirectoryGroupsLive;
type ListSlackDirectoryPeersLive =
  typeof import('../../slack/directory-live').listSlackDirectoryPeersLive;
type ProbeSlack = typeof import('../../slack/probe').probeSlack;
type ResolveSlackChannelAllowlist =
  typeof import('../../slack/resolve-channels').resolveSlackChannelAllowlist;
type ResolveSlackUserAllowlist =
  typeof import('../../slack/resolve-users').resolveSlackUserAllowlist;
type SendMessageSlack = typeof import('../../slack/send').sendMessageSlack;
type MonitorSlackProvider = typeof import('../../slack/index').monitorSlackProvider;
type HandleSlackAction = typeof import('../../agents/tools/slack-actions').handleSlackAction;
type AuditTelegramGroupMembership =
  typeof import('../../telegram/audit').auditTelegramGroupMembership;
type CollectTelegramUnmentionedGroupIds =
  typeof import('../../telegram/audit').collectTelegramUnmentionedGroupIds;
type ProbeTelegram = typeof import('../../telegram/probe').probeTelegram;
type ResolveTelegramToken = typeof import('../../telegram/token').resolveTelegramToken;
type SendMessageTelegram = typeof import('../../telegram/send').sendMessageTelegram;
type SendPollTelegram = typeof import('../../telegram/send').sendPollTelegram;
type MonitorTelegramProvider = typeof import('../../telegram/monitor').monitorTelegramProvider;
type TelegramMessageActions =
  typeof import('../../channels/plugins/actions/telegram').telegramMessageActions;
type ProbeSignal = typeof import('../../signal/probe').probeSignal;
type SendMessageSignal = typeof import('../../signal/send').sendMessageSignal;
type MonitorSignalProvider = typeof import('../../signal/index').monitorSignalProvider;
type SignalMessageActions =
  typeof import('../../channels/plugins/actions/signal').signalMessageActions;
type MonitorIMessageProvider = typeof import('../../imessage/monitor').monitorIMessageProvider;
type ProbeIMessage = typeof import('../../imessage/probe').probeIMessage;
type SendMessageIMessage = typeof import('../../imessage/send').sendMessageIMessage;
type GetActiveWebListener = typeof import('../../web/active-listener').getActiveWebListener;
type GetWebAuthAgeMs = typeof import('../../web/auth-store').getWebAuthAgeMs;
type LogoutWeb = typeof import('../../web/auth-store').logoutWeb;
type LogWebSelfId = typeof import('../../web/auth-store').logWebSelfId;
type ReadWebSelfId = typeof import('../../web/auth-store').readWebSelfId;
type WebAuthExists = typeof import('../../web/auth-store').webAuthExists;
type SendMessageWhatsApp = typeof import('../../web/outbound').sendMessageWhatsApp;
type SendPollWhatsApp = typeof import('../../web/outbound').sendPollWhatsApp;
type LoginWeb = typeof import('../../web/login').loginWeb;
type StartWebLoginWithQr = typeof import('../../web/login-qr').startWebLoginWithQr;
type WaitForWebLogin = typeof import('../../web/login-qr').waitForWebLogin;
type MonitorWebChannel = typeof import('../../channels/web/index').monitorWebChannel;
type HandleWhatsAppAction =
  typeof import('../../agents/tools/whatsapp-actions').handleWhatsAppAction;
type CreateWhatsAppLoginTool =
  typeof import('../../channels/plugins/agent-tools/whatsapp-login').createWhatsAppLoginTool;

// LINE channel types
type ListLineAccountIds = typeof import('../../line/accounts').listLineAccountIds;
type ResolveDefaultLineAccountId =
  typeof import('../../line/accounts').resolveDefaultLineAccountId;
type ResolveLineAccount = typeof import('../../line/accounts').resolveLineAccount;
type NormalizeLineAccountId = typeof import('../../line/accounts').normalizeAccountId;
type ProbeLineBot = typeof import('../../line/probe').probeLineBot;
type SendMessageLine = typeof import('../../line/send').sendMessageLine;
type PushMessageLine = typeof import('../../line/send').pushMessageLine;
type PushMessagesLine = typeof import('../../line/send').pushMessagesLine;
type PushFlexMessage = typeof import('../../line/send').pushFlexMessage;
type PushTemplateMessage = typeof import('../../line/send').pushTemplateMessage;
type PushLocationMessage = typeof import('../../line/send').pushLocationMessage;
type PushTextMessageWithQuickReplies =
  typeof import('../../line/send').pushTextMessageWithQuickReplies;
type CreateQuickReplyItems = typeof import('../../line/send').createQuickReplyItems;
type BuildTemplateMessageFromPayload =
  typeof import('../../line/template-messages').buildTemplateMessageFromPayload;
type MonitorLineProvider = typeof import('../../line/monitor').monitorLineProvider;

export type RuntimeLogger = {
  debug?: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

export type PluginRuntime = {
  version: string;
  config: {
    loadConfig: LoadConfig;
    writeConfigFile: WriteConfigFile;
  };
  system: {
    enqueueSystemEvent: EnqueueSystemEvent;
    runCommandWithTimeout: RunCommandWithTimeout;
    formatNativeDependencyHint: FormatNativeDependencyHint;
  };
  media: {
    loadWebMedia: LoadWebMedia;
    detectMime: DetectMime;
    mediaKindFromMime: MediaKindFromMime;
    isVoiceCompatibleAudio: IsVoiceCompatibleAudio;
    getImageMetadata: GetImageMetadata;
    resizeToJpeg: ResizeToJpeg;
  };
  tts: {
    textToSpeechTelephony: TextToSpeechTelephony;
  };
  tools: {
    createMemoryGetTool: CreateMemoryGetTool;
    createMemorySearchTool: CreateMemorySearchTool;
    registerMemoryCli: RegisterMemoryCli;
  };
  channel: {
    text: {
      chunkByNewline: ChunkByNewline;
      chunkMarkdownText: ChunkMarkdownText;
      chunkMarkdownTextWithMode: ChunkMarkdownTextWithMode;
      chunkText: ChunkText;
      chunkTextWithMode: ChunkTextWithMode;
      resolveChunkMode: ResolveChunkMode;
      resolveTextChunkLimit: ResolveTextChunkLimit;
      hasControlCommand: HasControlCommand;
      resolveMarkdownTableMode: ResolveMarkdownTableMode;
      convertMarkdownTables: ConvertMarkdownTables;
    };
    reply: {
      dispatchReplyWithBufferedBlockDispatcher: DispatchReplyWithBufferedBlockDispatcher;
      createReplyDispatcherWithTyping: CreateReplyDispatcherWithTyping;
      resolveEffectiveMessagesConfig: ResolveEffectiveMessagesConfig;
      resolveHumanDelayConfig: ResolveHumanDelayConfig;
      dispatchReplyFromConfig: DispatchReplyFromConfig;
      finalizeInboundContext: FinalizeInboundContext;
      formatAgentEnvelope: FormatAgentEnvelope;
      /** @deprecated Prefer `BodyForAgent` + structured user-context blocks (do not build plaintext envelopes for prompts). */
      formatInboundEnvelope: FormatInboundEnvelope;
      resolveEnvelopeFormatOptions: ResolveEnvelopeFormatOptions;
    };
    routing: {
      resolveAgentRoute: ResolveAgentRoute;
    };
    pairing: {
      buildPairingReply: BuildPairingReply;
      readAllowFromStore: ReadChannelAllowFromStore;
      upsertPairingRequest: UpsertChannelPairingRequest;
    };
    media: {
      fetchRemoteMedia: FetchRemoteMedia;
      saveMediaBuffer: SaveMediaBuffer;
    };
    activity: {
      record: RecordChannelActivity;
      get: GetChannelActivity;
    };
    session: {
      resolveStorePath: ResolveStorePath;
      readSessionUpdatedAt: ReadSessionUpdatedAt;
      recordSessionMetaFromInbound: RecordSessionMetaFromInbound;
      recordInboundSession: RecordInboundSession;
      updateLastRoute: UpdateLastRoute;
    };
    mentions: {
      buildMentionRegexes: BuildMentionRegexes;
      matchesMentionPatterns: MatchesMentionPatterns;
      matchesMentionWithExplicit: MatchesMentionWithExplicit;
    };
    reactions: {
      shouldAckReaction: ShouldAckReaction;
      removeAckReactionAfterReply: RemoveAckReactionAfterReply;
    };
    groups: {
      resolveGroupPolicy: ResolveChannelGroupPolicy;
      resolveRequireMention: ResolveChannelGroupRequireMention;
    };
    debounce: {
      createInboundDebouncer: CreateInboundDebouncer;
      resolveInboundDebounceMs: ResolveInboundDebounceMs;
    };
    commands: {
      resolveCommandAuthorizedFromAuthorizers: ResolveCommandAuthorizedFromAuthorizers;
      isControlCommandMessage: IsControlCommandMessage;
      shouldComputeCommandAuthorized: ShouldComputeCommandAuthorized;
      shouldHandleTextCommands: ShouldHandleTextCommands;
    };
    discord: {
      messageActions: DiscordMessageActions;
      auditChannelPermissions: AuditDiscordChannelPermissions;
      listDirectoryGroupsLive: ListDiscordDirectoryGroupsLive;
      listDirectoryPeersLive: ListDiscordDirectoryPeersLive;
      probeDiscord: ProbeDiscord;
      resolveChannelAllowlist: ResolveDiscordChannelAllowlist;
      resolveUserAllowlist: ResolveDiscordUserAllowlist;
      sendMessageDiscord: SendMessageDiscord;
      sendPollDiscord: SendPollDiscord;
      monitorDiscordProvider: MonitorDiscordProvider;
    };
    slack: {
      listDirectoryGroupsLive: ListSlackDirectoryGroupsLive;
      listDirectoryPeersLive: ListSlackDirectoryPeersLive;
      probeSlack: ProbeSlack;
      resolveChannelAllowlist: ResolveSlackChannelAllowlist;
      resolveUserAllowlist: ResolveSlackUserAllowlist;
      sendMessageSlack: SendMessageSlack;
      monitorSlackProvider: MonitorSlackProvider;
      handleSlackAction: HandleSlackAction;
    };
    telegram: {
      auditGroupMembership: AuditTelegramGroupMembership;
      collectUnmentionedGroupIds: CollectTelegramUnmentionedGroupIds;
      probeTelegram: ProbeTelegram;
      resolveTelegramToken: ResolveTelegramToken;
      sendMessageTelegram: SendMessageTelegram;
      sendPollTelegram: SendPollTelegram;
      monitorTelegramProvider: MonitorTelegramProvider;
      messageActions: TelegramMessageActions;
    };
    signal: {
      probeSignal: ProbeSignal;
      sendMessageSignal: SendMessageSignal;
      monitorSignalProvider: MonitorSignalProvider;
      messageActions: SignalMessageActions;
    };
    imessage: {
      monitorIMessageProvider: MonitorIMessageProvider;
      probeIMessage: ProbeIMessage;
      sendMessageIMessage: SendMessageIMessage;
    };
    whatsapp: {
      getActiveWebListener: GetActiveWebListener;
      getWebAuthAgeMs: GetWebAuthAgeMs;
      logoutWeb: LogoutWeb;
      logWebSelfId: LogWebSelfId;
      readWebSelfId: ReadWebSelfId;
      webAuthExists: WebAuthExists;
      sendMessageWhatsApp: SendMessageWhatsApp;
      sendPollWhatsApp: SendPollWhatsApp;
      loginWeb: LoginWeb;
      startWebLoginWithQr: StartWebLoginWithQr;
      waitForWebLogin: WaitForWebLogin;
      monitorWebChannel: MonitorWebChannel;
      handleWhatsAppAction: HandleWhatsAppAction;
      createLoginTool: CreateWhatsAppLoginTool;
    };
    line: {
      listLineAccountIds: ListLineAccountIds;
      resolveDefaultLineAccountId: ResolveDefaultLineAccountId;
      resolveLineAccount: ResolveLineAccount;
      normalizeAccountId: NormalizeLineAccountId;
      probeLineBot: ProbeLineBot;
      sendMessageLine: SendMessageLine;
      pushMessageLine: PushMessageLine;
      pushMessagesLine: PushMessagesLine;
      pushFlexMessage: PushFlexMessage;
      pushTemplateMessage: PushTemplateMessage;
      pushLocationMessage: PushLocationMessage;
      pushTextMessageWithQuickReplies: PushTextMessageWithQuickReplies;
      createQuickReplyItems: CreateQuickReplyItems;
      buildTemplateMessageFromPayload: BuildTemplateMessageFromPayload;
      monitorLineProvider: MonitorLineProvider;
    };
  };
  logging: {
    shouldLogVerbose: ShouldLogVerbose;
    getChildLogger: (
      bindings?: Record<string, unknown>,
      opts?: { level?: LogLevel },
    ) => RuntimeLogger;
  };
  state: {
    resolveStateDir: ResolveStateDir;
  };
};
