import type { ModelCatalogEntry } from '../../agents/model-catalog';
import type { createDefaultDeps } from '../../cli/deps';
import type { HealthSummary } from '../../commands/health';
import type { CronService } from '../../cron/service';
import type { createSubsystemLogger } from '../../logging/subsystem';
import type { WizardSession } from '../../wizard/session';
import type { ChatAbortControllerEntry } from '../chat-abort';
import type { ExecApprovalManager } from '../exec-approval-manager';
import type { NodeRegistry } from '../node-registry';
import type { ConnectParams, ErrorShape, RequestFrame } from '../protocol/index';
import type { GatewayBroadcastFn, GatewayBroadcastToConnIdsFn } from '../server-broadcast';
import type { ChannelRuntimeSnapshot } from '../server-channels';
import type { DedupeEntry } from '../server-shared';

type SubsystemLogger = ReturnType<typeof createSubsystemLogger>;

export type GatewayClient = {
  connect: ConnectParams;
  connId?: string;
  clientIp?: string;
};

export type RespondFn = (
  ok: boolean,
  payload?: unknown,
  error?: ErrorShape,
  meta?: Record<string, unknown>,
) => void;

export type GatewayRequestContext = {
  deps: ReturnType<typeof createDefaultDeps>;
  cron: CronService;
  cronStorePath: string;
  execApprovalManager?: ExecApprovalManager;
  loadGatewayModelCatalog: () => Promise<ModelCatalogEntry[]>;
  getHealthCache: () => HealthSummary | null;
  refreshHealthSnapshot: (opts?: { probe?: boolean }) => Promise<HealthSummary>;
  logHealth: { error: (message: string) => void };
  logGateway: SubsystemLogger;
  incrementPresenceVersion: () => number;
  getHealthVersion: () => number;
  broadcast: GatewayBroadcastFn;
  broadcastToConnIds: GatewayBroadcastToConnIdsFn;
  nodeSendToSession: (sessionKey: string, event: string, payload: unknown) => void;
  nodeSendToAllSubscribed: (event: string, payload: unknown) => void;
  nodeSubscribe: (nodeId: string, sessionKey: string) => void;
  nodeUnsubscribe: (nodeId: string, sessionKey: string) => void;
  nodeUnsubscribeAll: (nodeId: string) => void;
  hasConnectedMobileNode: () => boolean;
  nodeRegistry: NodeRegistry;
  agentRunSeq: Map<string, number>;
  chatAbortControllers: Map<string, ChatAbortControllerEntry>;
  chatAbortedRuns: Map<string, number>;
  chatRunBuffers: Map<string, string>;
  chatDeltaSentAt: Map<string, number>;
  addChatRun: (sessionId: string, entry: { sessionKey: string; clientRunId: string }) => void;
  removeChatRun: (
    sessionId: string,
    clientRunId: string,
    sessionKey?: string,
  ) => { sessionKey: string; clientRunId: string } | undefined;
  registerToolEventRecipient: (runId: string, connId: string) => void;
  dedupe: Map<string, DedupeEntry>;
  wizardSessions: Map<string, WizardSession>;
  findRunningWizard: () => string | null;
  purgeWizardSession: (id: string) => void;
  getRuntimeSnapshot: () => ChannelRuntimeSnapshot;
  startChannel: (
    channel: import('../../channels/plugins/types').ChannelId,
    accountId?: string,
  ) => Promise<void>;
  stopChannel: (
    channel: import('../../channels/plugins/types').ChannelId,
    accountId?: string,
  ) => Promise<void>;
  markChannelLoggedOut: (
    channelId: import('../../channels/plugins/types').ChannelId,
    cleared: boolean,
    accountId?: string,
  ) => void;
  wizardRunner: (
    opts: import('../../commands/onboard-types').OnboardOptions,
    runtime: import('../../runtime').RuntimeEnv,
    prompter: import('../../wizard/prompts').WizardPrompter,
  ) => Promise<void>;
  broadcastVoiceWakeChanged: (triggers: string[]) => void;
};

export type GatewayRequestOptions = {
  req: RequestFrame;
  client: GatewayClient | null;
  isWebchatConnect: (params: ConnectParams | null | undefined) => boolean;
  respond: RespondFn;
  context: GatewayRequestContext;
};

export type GatewayRequestHandlerOptions = {
  req: RequestFrame;
  params: Record<string, unknown>;
  client: GatewayClient | null;
  isWebchatConnect: (params: ConnectParams | null | undefined) => boolean;
  respond: RespondFn;
  context: GatewayRequestContext;
};

export type GatewayRequestHandler = (opts: GatewayRequestHandlerOptions) => Promise<void> | void;

export type GatewayRequestHandlers = Record<string, GatewayRequestHandler>;
