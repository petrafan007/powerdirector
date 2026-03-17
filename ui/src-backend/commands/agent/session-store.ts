import { setCliSessionId } from '../../agents/cli-session';
import { lookupContextTokens } from '../../agents/context';
import { DEFAULT_CONTEXT_TOKENS } from '../../agents/defaults';
import { isCliProvider } from '../../agents/model-selection';
import { deriveSessionTotalTokens, hasNonzeroUsage } from '../../agents/usage';
import type { PowerDirectorConfig } from '../../config/config';
import { type SessionEntry, updateSessionStore } from '../../config/sessions';

type RunResult = Awaited<
  ReturnType<(typeof import('../../agents/pi-embedded'))["runEmbeddedPiAgent"]>
>;

export async function updateSessionStoreAfterAgentRun(params: {
  cfg: PowerDirectorConfig;
  contextTokensOverride?: number;
  sessionId: string;
  sessionKey: string;
  storePath: string;
  sessionStore: Record<string, SessionEntry>;
  defaultProvider: string;
  defaultModel: string;
  fallbackProvider?: string;
  fallbackModel?: string;
  result: RunResult;
}) {
  const {
    cfg,
    sessionId,
    sessionKey,
    storePath,
    sessionStore,
    defaultProvider,
    defaultModel,
    fallbackProvider,
    fallbackModel,
    result,
  } = params;

  const usage = result.meta.agentMeta?.usage;
  const promptTokens = result.meta.agentMeta?.promptTokens;
  const compactionsThisRun = Math.max(0, result.meta.agentMeta?.compactionCount ?? 0);
  const modelUsed = result.meta.agentMeta?.model ?? fallbackModel ?? defaultModel;
  const providerUsed = result.meta.agentMeta?.provider ?? fallbackProvider ?? defaultProvider;
  const contextTokens =
    params.contextTokensOverride ?? lookupContextTokens(modelUsed) ?? DEFAULT_CONTEXT_TOKENS;

  const entry = sessionStore[sessionKey] ?? {
    sessionId,
    updatedAt: Date.now(),
  };
  const next: SessionEntry = {
    ...entry,
    sessionId,
    updatedAt: Date.now(),
    modelProvider: providerUsed,
    model: modelUsed,
    contextTokens,
  };
  if (isCliProvider(providerUsed, cfg)) {
    const cliSessionId = result.meta.agentMeta?.sessionId?.trim();
    if (cliSessionId) {
      setCliSessionId(next, providerUsed, cliSessionId);
    }
  }
  next.abortedLastRun = result.meta.aborted ?? false;
  if (hasNonzeroUsage(usage)) {
    const input = usage.input ?? 0;
    const output = usage.output ?? 0;
    const totalTokens =
      deriveSessionTotalTokens({
        usage,
        contextTokens,
        promptTokens,
      }) ?? input;
    next.inputTokens = input;
    next.outputTokens = output;
    next.totalTokens = totalTokens;
    next.totalTokensFresh = true;
  }
  if (compactionsThisRun > 0) {
    next.compactionCount = (entry.compactionCount ?? 0) + compactionsThisRun;
  }
  sessionStore[sessionKey] = next;
  await updateSessionStore(storePath, (store) => {
    store[sessionKey] = next;
  });
}
