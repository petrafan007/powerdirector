import type { FinalizedMsgContext } from '../../../auto-reply/templating';
import type { ResolvedAgentRoute } from '../../../routing/resolve-route';
import type { ResolvedSlackAccount } from '../../accounts';
import type { SlackMessageEvent } from '../../types';
import type { SlackChannelConfigResolved } from '../channel-config';
import type { SlackMonitorContext } from '../context';

export type PreparedSlackMessage = {
  ctx: SlackMonitorContext;
  account: ResolvedSlackAccount;
  message: SlackMessageEvent;
  route: ResolvedAgentRoute;
  channelConfig: SlackChannelConfigResolved | null;
  replyTarget: string;
  ctxPayload: FinalizedMsgContext;
  isDirectMessage: boolean;
  isRoomish: boolean;
  historyKey: string;
  preview: string;
  ackReactionMessageTs?: string;
  ackReactionValue: string;
  ackReactionPromise: Promise<boolean> | null;
};
