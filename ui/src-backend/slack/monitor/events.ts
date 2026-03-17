import type { ResolvedSlackAccount } from '../accounts';
import type { SlackMonitorContext } from './context';
import { registerSlackChannelEvents } from './events/channels';
import { registerSlackInteractionEvents } from './events/interactions';
import { registerSlackMemberEvents } from './events/members';
import { registerSlackMessageEvents } from './events/messages';
import { registerSlackPinEvents } from './events/pins';
import { registerSlackReactionEvents } from './events/reactions';
import type { SlackMessageHandler } from './message-handler';

export function registerSlackMonitorEvents(params: {
  ctx: SlackMonitorContext;
  account: ResolvedSlackAccount;
  handleSlackMessage: SlackMessageHandler;
}) {
  registerSlackMessageEvents({
    ctx: params.ctx,
    handleSlackMessage: params.handleSlackMessage,
  });
  registerSlackReactionEvents({ ctx: params.ctx });
  registerSlackMemberEvents({ ctx: params.ctx });
  registerSlackChannelEvents({ ctx: params.ctx });
  registerSlackPinEvents({ ctx: params.ctx });
  registerSlackInteractionEvents({ ctx: params.ctx });
}
