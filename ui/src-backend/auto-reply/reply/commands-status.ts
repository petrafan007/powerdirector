import {
  resolveAgentDir,
  resolveDefaultAgentId,
  resolveSessionAgentId,
} from '../../agents/agent-scope';
import { resolveModelAuthLabel } from '../../agents/model-auth-label';
import { listSubagentRunsForRequester } from '../../agents/subagent-registry';
import {
  resolveInternalSessionKey,
  resolveMainSessionAlias,
} from '../../agents/tools/sessions-helpers';
import type { PowerDirectorConfig } from '../../config/config';
import type { SessionEntry, SessionScope } from '../../config/sessions';
import { logVerbose } from '../../globals';
import {
  formatUsageWindowSummary,
  loadProviderUsageSummary,
  resolveUsageProviderId,
} from '../../infra/provider-usage';
import type { MediaUnderstandingDecision } from '../../media-understanding/types';
import { normalizeGroupActivation } from '../group-activation';
import { buildStatusMessage } from '../status';
import type { ElevatedLevel, ReasoningLevel, ThinkLevel, VerboseLevel } from '../thinking';
import type { ReplyPayload } from '../types';
import type { CommandContext } from './commands-types';
import { getFollowupQueueDepth, resolveQueueSettings } from './queue';
import { resolveSubagentLabel } from './subagents-utils';

export async function buildStatusReply(params: {
  cfg: PowerDirectorConfig;
  command: CommandContext;
  sessionEntry?: SessionEntry;
  sessionKey: string;
  sessionScope?: SessionScope;
  storePath?: string;
  provider: string;
  model: string;
  contextTokens: number;
  resolvedThinkLevel?: ThinkLevel;
  resolvedVerboseLevel: VerboseLevel;
  resolvedReasoningLevel: ReasoningLevel;
  resolvedElevatedLevel?: ElevatedLevel;
  resolveDefaultThinkingLevel: () => Promise<ThinkLevel | undefined>;
  isGroup: boolean;
  defaultGroupActivation: () => "always" | "mention";
  mediaDecisions?: MediaUnderstandingDecision[];
}): Promise<ReplyPayload | undefined> {
  const {
    cfg,
    command,
    sessionEntry,
    sessionKey,
    sessionScope,
    storePath,
    provider,
    model,
    contextTokens,
    resolvedThinkLevel,
    resolvedVerboseLevel,
    resolvedReasoningLevel,
    resolvedElevatedLevel,
    resolveDefaultThinkingLevel,
    isGroup,
    defaultGroupActivation,
  } = params;
  if (!command.isAuthorizedSender) {
    logVerbose(`Ignoring /status from unauthorized sender: ${command.senderId || "<unknown>"}`);
    return undefined;
  }
  const statusAgentId = sessionKey
    ? resolveSessionAgentId({ sessionKey, config: cfg })
    : resolveDefaultAgentId(cfg);
  const statusAgentDir = resolveAgentDir(cfg, statusAgentId);
  const currentUsageProvider = (() => {
    try {
      return resolveUsageProviderId(provider);
    } catch {
      return undefined;
    }
  })();
  let usageLine: string | null = null;
  if (currentUsageProvider) {
    try {
      const usageSummary = await loadProviderUsageSummary({
        timeoutMs: 3500,
        providers: [currentUsageProvider],
        agentDir: statusAgentDir,
      });
      const usageEntry = usageSummary.providers[0];
      if (usageEntry && !usageEntry.error && usageEntry.windows.length > 0) {
        const summaryLine = formatUsageWindowSummary(usageEntry, {
          now: Date.now(),
          maxWindows: 2,
          includeResets: true,
        });
        if (summaryLine) {
          usageLine = `📊 Usage: ${summaryLine}`;
        }
      }
    } catch {
      usageLine = null;
    }
  }
  const queueSettings = resolveQueueSettings({
    cfg,
    channel: command.channel,
    sessionEntry,
  });
  const queueKey = sessionKey ?? sessionEntry?.sessionId;
  const queueDepth = queueKey ? getFollowupQueueDepth(queueKey) : 0;
  const queueOverrides = Boolean(
    sessionEntry?.queueDebounceMs ?? sessionEntry?.queueCap ?? sessionEntry?.queueDrop,
  );

  let subagentsLine: string | undefined;
  if (sessionKey) {
    const { mainKey, alias } = resolveMainSessionAlias(cfg);
    const requesterKey = resolveInternalSessionKey({ key: sessionKey, alias, mainKey });
    const runs = listSubagentRunsForRequester(requesterKey);
    const verboseEnabled = resolvedVerboseLevel && resolvedVerboseLevel !== "off";
    if (runs.length > 0) {
      const active = runs.filter((entry) => !entry.endedAt);
      const done = runs.length - active.length;
      if (verboseEnabled) {
        const labels = active
          .map((entry) => resolveSubagentLabel(entry, ""))
          .filter(Boolean)
          .slice(0, 3);
        const labelText = labels.length ? ` (${labels.join(", ")})` : "";
        subagentsLine = `🤖 Subagents: ${active.length} active${labelText} · ${done} done`;
      } else if (active.length > 0) {
        subagentsLine = `🤖 Subagents: ${active.length} active`;
      }
    }
  }
  const groupActivation = isGroup
    ? (normalizeGroupActivation(sessionEntry?.groupActivation) ?? defaultGroupActivation())
    : undefined;
  const agentDefaults = cfg.agents?.defaults ?? {};
  const statusText = buildStatusMessage({
    config: cfg,
    agent: {
      ...agentDefaults,
      model: {
        ...agentDefaults.model,
        primary: `${provider}/${model}`,
      },
      contextTokens,
      thinkingDefault: agentDefaults.thinkingDefault,
      verboseDefault: agentDefaults.verboseDefault,
      elevatedDefault: agentDefaults.elevatedDefault,
    },
    agentId: statusAgentId,
    sessionEntry,
    sessionKey,
    sessionScope,
    sessionStorePath: storePath,
    groupActivation,
    resolvedThink: resolvedThinkLevel ?? (await resolveDefaultThinkingLevel()),
    resolvedVerbose: resolvedVerboseLevel,
    resolvedReasoning: resolvedReasoningLevel,
    resolvedElevated: resolvedElevatedLevel,
    modelAuth: resolveModelAuthLabel({
      provider,
      cfg,
      sessionEntry,
      agentDir: statusAgentDir,
    }),
    usageLine: usageLine ?? undefined,
    queue: {
      mode: queueSettings.mode,
      depth: queueDepth,
      debounceMs: queueSettings.debounceMs,
      cap: queueSettings.cap,
      dropPolicy: queueSettings.dropPolicy,
      showDetails: queueOverrides,
    },
    subagentsLine,
    mediaDecisions: params.mediaDecisions,
    includeTranscriptUsage: false,
  });

  return { text: statusText };
}
