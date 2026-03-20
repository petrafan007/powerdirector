import { handleSlackAction, type SlackActionContext } from "../../agents/tools/slack-actions";
import { handleSlackMessageAction } from "../../plugin-sdk/slack-message-actions";
import { extractSlackToolSend, listSlackMessageActions } from "../../slack/message-actions";
import { resolveSlackChannelId } from "../../slack/targets";
import type { ChannelMessageActionAdapter } from "./types";

export function createSlackActions(providerId: string): ChannelMessageActionAdapter {
  return {
    listActions: ({ cfg }) => listSlackMessageActions(cfg),
    extractToolSend: ({ args }) => extractSlackToolSend(args),
    handleAction: async (ctx) => {
      return await handleSlackMessageAction({
        providerId,
        ctx,
        normalizeChannelId: resolveSlackChannelId,
        includeReadThreadId: true,
        invoke: async (action, cfg, toolContext) =>
          await handleSlackAction(action, cfg, {
            ...(toolContext as SlackActionContext | undefined),
            mediaLocalRoots: ctx.mediaLocalRoots,
          }),
      });
    },
  };
}
