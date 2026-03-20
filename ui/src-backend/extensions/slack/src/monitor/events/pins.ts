import type { SlackEventMiddlewareArgs } from "@slack/bolt";
import { enqueueSystemEvent } from "@/src-backend/plugin-sdk/infra-runtime";
import { danger } from "@/src-backend/plugin-sdk/runtime-env";
import type { SlackMonitorContext } from "../context";
import type { SlackPinEvent } from "../types";
import { authorizeAndResolveSlackSystemEventContext } from "./system-event-context";

async function handleSlackPinEvent(params: {
  ctx: SlackMonitorContext;
  trackEvent?: () => void;
  body: unknown;
  event: unknown;
  action: "pinned" | "unpinned";
  contextKeySuffix: "added" | "removed";
  errorLabel: string;
}): Promise<void> {
  const { ctx, trackEvent, body, event, action, contextKeySuffix, errorLabel } = params;

  try {
    if (ctx.shouldDropMismatchedSlackEvent(body)) {
      return;
    }
    trackEvent?.();

    const payload = event as SlackPinEvent;
    const channelId = payload.channel_id;
    const ingressContext = await authorizeAndResolveSlackSystemEventContext({
      ctx,
      senderId: payload.user,
      channelId,
      eventKind: "pin",
    });
    if (!ingressContext) {
      return;
    }
    const userInfo = payload.user ? await ctx.resolveUserName(payload.user) : {};
    const userLabel = userInfo?.name ?? payload.user ?? "someone";
    const itemType = payload.item?.type ?? "item";
    const messageId = payload.item?.message?.ts ?? payload.event_ts;
    enqueueSystemEvent(
      `Slack: ${userLabel} ${action} a ${itemType} in ${ingressContext.channelLabel}.`,
      {
        sessionKey: ingressContext.sessionKey,
        contextKey: `slack:pin:${contextKeySuffix}:${channelId ?? "unknown"}:${messageId ?? "unknown"}`,
      },
    );
  } catch (err) {
    ctx.runtime.error?.(danger(`slack ${errorLabel} handler failed: ${String(err)}`));
  }
}

export function registerSlackPinEvents(params: {
  ctx: SlackMonitorContext;
  trackEvent?: () => void;
}) {
  const { ctx, trackEvent } = params;

  ctx.app.event("pin_added", async ({ event, body }: SlackEventMiddlewareArgs<"pin_added">) => {
    await handleSlackPinEvent({
      ctx,
      trackEvent,
      body,
      event,
      action: "pinned",
      contextKeySuffix: "added",
      errorLabel: "pin added",
    });
  });

  ctx.app.event("pin_removed", async ({ event, body }: SlackEventMiddlewareArgs<"pin_removed">) => {
    await handleSlackPinEvent({
      ctx,
      trackEvent,
      body,
      event,
      action: "unpinned",
      contextKeySuffix: "removed",
      errorLabel: "pin removed",
    });
  });
}
