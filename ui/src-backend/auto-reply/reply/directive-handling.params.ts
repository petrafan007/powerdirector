import type { ModelAliasIndex } from '../../agents/model-selection';
import type { PowerDirectorConfig } from '../../config/config';
import type { SessionEntry } from '../../config/sessions';
import type { MsgContext } from '../templating';
import type { InlineDirectives } from './directive-handling.parse';
import type { ElevatedLevel, ReasoningLevel, ThinkLevel, VerboseLevel } from './directives';

export type HandleDirectiveOnlyCoreParams = {
  cfg: PowerDirectorConfig;
  directives: InlineDirectives;
  sessionEntry: SessionEntry;
  sessionStore: Record<string, SessionEntry>;
  sessionKey: string;
  storePath?: string;
  elevatedEnabled: boolean;
  elevatedAllowed: boolean;
  elevatedFailures?: Array<{ gate: string; key: string }>;
  messageProviderKey?: string;
  defaultProvider: string;
  defaultModel: string;
  aliasIndex: ModelAliasIndex;
  allowedModelKeys: Set<string>;
  allowedModelCatalog: Awaited<
    ReturnType<typeof import('../../agents/model-catalog').loadModelCatalog>
  >;
  resetModelOverride: boolean;
  provider: string;
  model: string;
  initialModelLabel: string;
  formatModelSwitchEvent: (label: string, alias?: string) => string;
};

export type HandleDirectiveOnlyParams = HandleDirectiveOnlyCoreParams & {
  currentThinkLevel?: ThinkLevel;
  currentVerboseLevel?: VerboseLevel;
  currentReasoningLevel?: ReasoningLevel;
  currentElevatedLevel?: ElevatedLevel;
  surface?: string;
};

export type ApplyInlineDirectivesFastLaneParams = HandleDirectiveOnlyCoreParams & {
  commandAuthorized: boolean;
  ctx: MsgContext;
  agentId?: string;
  isGroup: boolean;
  agentCfg?: NonNullable<PowerDirectorConfig["agents"]>["defaults"];
  modelState: {
    resolveDefaultThinkingLevel: () => Promise<ThinkLevel | undefined>;
    allowedModelKeys: Set<string>;
    allowedModelCatalog: Awaited<
      ReturnType<typeof import('../../agents/model-catalog').loadModelCatalog>
    >;
    resetModelOverride: boolean;
  };
};
