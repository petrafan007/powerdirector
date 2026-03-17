import type { SkillCommandSpec } from '../../agents/skills';
import type { ChannelId } from '../../channels/plugins/types';
import type { PowerDirectorConfig } from '../../config/config';
import type { SessionEntry, SessionScope } from '../../config/sessions';
import type { MsgContext } from '../templating';
import type { ElevatedLevel, ReasoningLevel, ThinkLevel, VerboseLevel } from '../thinking';
import type { ReplyPayload } from '../types';
import type { InlineDirectives } from './directive-handling';

export type CommandContext = {
  surface: string;
  channel: string;
  channelId?: ChannelId;
  ownerList: string[];
  senderIsOwner: boolean;
  isAuthorizedSender: boolean;
  senderId?: string;
  abortKey?: string;
  rawBodyNormalized: string;
  commandBodyNormalized: string;
  from?: string;
  to?: string;
};

export type HandleCommandsParams = {
  ctx: MsgContext;
  cfg: PowerDirectorConfig;
  command: CommandContext;
  agentId?: string;
  directives: InlineDirectives;
  elevated: {
    enabled: boolean;
    allowed: boolean;
    failures: Array<{ gate: string; key: string }>;
  };
  sessionEntry?: SessionEntry;
  previousSessionEntry?: SessionEntry;
  sessionStore?: Record<string, SessionEntry>;
  sessionKey: string;
  storePath?: string;
  sessionScope?: SessionScope;
  workspaceDir: string;
  defaultGroupActivation: () => "always" | "mention";
  resolvedThinkLevel?: ThinkLevel;
  resolvedVerboseLevel: VerboseLevel;
  resolvedReasoningLevel: ReasoningLevel;
  resolvedElevatedLevel?: ElevatedLevel;
  resolveDefaultThinkingLevel: () => Promise<ThinkLevel | undefined>;
  provider: string;
  model: string;
  contextTokens: number;
  isGroup: boolean;
  skillCommands?: SkillCommandSpec[];
};

export type CommandHandlerResult = {
  reply?: ReplyPayload;
  shouldContinue: boolean;
};

export type CommandHandler = (
  params: HandleCommandsParams,
  allowTextCommands: boolean,
) => Promise<CommandHandlerResult | null>;
