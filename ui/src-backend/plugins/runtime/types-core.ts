import type { LogLevel } from "../../logging/levels";

export type RuntimeLogger = {
  debug?: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

export type PluginRuntimeCore = {
  version: string;
  config: {
    loadConfig: typeof import("../../config/config").loadConfig;
    writeConfigFile: typeof import("../../config/config").writeConfigFile;
  };
  agent: {
    defaults: {
      model: typeof import("../../agents/defaults").DEFAULT_MODEL;
      provider: typeof import("../../agents/defaults").DEFAULT_PROVIDER;
    };
    resolveAgentDir: typeof import("../../agents/agent-scope").resolveAgentDir;
    resolveAgentWorkspaceDir: typeof import("../../agents/agent-scope").resolveAgentWorkspaceDir;
    resolveAgentIdentity: typeof import("../../agents/identity").resolveAgentIdentity;
    resolveThinkingDefault: typeof import("../../agents/model-selection").resolveThinkingDefault;
    runEmbeddedPiAgent: typeof import("../../agents/pi-embedded").runEmbeddedPiAgent;
    resolveAgentTimeoutMs: typeof import("../../agents/timeout").resolveAgentTimeoutMs;
    ensureAgentWorkspace: typeof import("../../agents/workspace").ensureAgentWorkspace;
    session: {
      resolveStorePath: typeof import("../../config/sessions").resolveStorePath;
      loadSessionStore: typeof import("../../config/sessions").loadSessionStore;
      saveSessionStore: typeof import("../../config/sessions").saveSessionStore;
      resolveSessionFilePath: typeof import("../../config/sessions").resolveSessionFilePath;
    };
  };
  system: {
    enqueueSystemEvent: typeof import("../../infra/system-events").enqueueSystemEvent;
    requestHeartbeatNow: typeof import("../../infra/heartbeat-wake").requestHeartbeatNow;
    runCommandWithTimeout: typeof import("../../process/exec").runCommandWithTimeout;
    formatNativeDependencyHint: typeof import("./native-deps").formatNativeDependencyHint;
  };
  media: {
    loadWebMedia: typeof import("../../media/web-media").loadWebMedia;
    detectMime: typeof import("../../media/mime").detectMime;
    mediaKindFromMime: typeof import("../../media/constants").mediaKindFromMime;
    isVoiceCompatibleAudio: typeof import("../../media/audio").isVoiceCompatibleAudio;
    getImageMetadata: typeof import("../../media/image-ops").getImageMetadata;
    resizeToJpeg: typeof import("../../media/image-ops").resizeToJpeg;
  };
  tts: {
    textToSpeech: typeof import("../../tts/runtime").textToSpeech;
    textToSpeechTelephony: typeof import("../../tts/runtime").textToSpeechTelephony;
    listVoices: typeof import("../../tts/runtime").listSpeechVoices;
  };
  mediaUnderstanding: {
    runFile: typeof import("../../media-understanding/runtime").runMediaUnderstandingFile;
    describeImageFile: typeof import("../../media-understanding/runtime").describeImageFile;
    describeImageFileWithModel: typeof import("../../media-understanding/runtime").describeImageFileWithModel;
    describeVideoFile: typeof import("../../media-understanding/runtime").describeVideoFile;
    transcribeAudioFile: typeof import("../../media-understanding/runtime").transcribeAudioFile;
  };
  imageGeneration: {
    generate: typeof import("../../image-generation/runtime").generateImage;
    listProviders: typeof import("../../image-generation/runtime").listRuntimeImageGenerationProviders;
  };
  webSearch: {
    listProviders: typeof import("../../web-search/runtime").listWebSearchProviders;
    search: typeof import("../../web-search/runtime").runWebSearch;
  };
  stt: {
    transcribeAudioFile: typeof import("../../media-understanding/transcribe-audio").transcribeAudioFile;
  };
  tools: {
    createMemoryGetTool: typeof import("../../agents/tools/memory-tool").createMemoryGetTool;
    createMemorySearchTool: typeof import("../../agents/tools/memory-tool").createMemorySearchTool;
    registerMemoryCli: typeof import("../../cli/memory-cli").registerMemoryCli;
  };
  events: {
    onAgentEvent: typeof import("../../infra/agent-events").onAgentEvent;
    onSessionTranscriptUpdate: typeof import("../../sessions/transcript-events").onSessionTranscriptUpdate;
  };
  logging: {
    shouldLogVerbose: typeof import("../../globals").shouldLogVerbose;
    getChildLogger: (
      bindings?: Record<string, unknown>,
      opts?: { level?: LogLevel },
    ) => RuntimeLogger;
  };
  state: {
    resolveStateDir: typeof import("../../config/paths").resolveStateDir;
  };
  modelAuth: {
    /** Resolve auth for a model. Only provider/model and optional cfg are used. */
    getApiKeyForModel: (params: {
      model: import("@mariozechner/pi-ai").Model<import("@mariozechner/pi-ai").Api>;
      cfg?: import("../../config/config").PowerDirectorConfig;
    }) => Promise<import("../../agents/model-auth").ResolvedProviderAuth>;
    /** Resolve auth for a provider by name. Only provider and optional cfg are used. */
    resolveApiKeyForProvider: (params: {
      provider: string;
      cfg?: import("../../config/config").PowerDirectorConfig;
    }) => Promise<import("../../agents/model-auth").ResolvedProviderAuth>;
  };
};
