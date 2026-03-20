import { logVerbose } from "@/src-backend/plugin-sdk/runtime-env";
import { authorizeSlackSystemEventSender } from "../auth";
import { resolveSlackChannelLabel } from "../channel-config";
import type { SlackMonitorContext } from "../context";

export type SlackAuthorizedSystemEventContext = {
  channelLabel: string;
  sessionKey: string;
};

export async function authorizeAndResolveSlackSystemEventContext(params: {
  ctx: SlackMonitorContext;
  senderId?: string;
  channelId?: string;
  channelType?: string | null;
  eventKind: string;
}): Promise<SlackAuthorizedSystemEventContext | undefined> {
  const { ctx, senderId, channelId, channelType, eventKind } = params;
  const auth = await authorizeSlackSystemEventSender({
    ctx,
    senderId,
    channelId,
    channelType,
  });
  if (!auth.allowed) {
    logVerbose(
      `slack: drop ${eventKind} sender ${senderId ?? "unknown"} channel=${channelId ?? "unknown"} reason=${auth.reason ?? "unauthorized"}`,
    );
    return undefined;
  }

  const channelLabel = resolveSlackChannelLabel({
    channelId,
    channelName: auth.channelName,
  });
  const sessionKey = ctx.resolveSlackSystemEventSessionKey({
    channelId,
    channelType: auth.channelType,
    senderId,
  });
  return {
    channelLabel,
    sessionKey,
  };
}
