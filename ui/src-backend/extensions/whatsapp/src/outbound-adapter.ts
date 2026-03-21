import { sendTextMediaPayload } from "powerdirector/plugin-sdk/channel-runtime";
import type { ChannelOutboundAdapter } from "powerdirector/plugin-sdk/channel-runtime";
import { resolveOutboundSendDep } from "powerdirector/plugin-sdk/channel-runtime";
import {
  createAttachedChannelResultAdapter,
  createEmptyChannelResult,
} from "powerdirector/plugin-sdk/channel-send-result";
import { resolveSendableOutboundReplyParts } from "powerdirector/plugin-sdk/reply-payload";
import { chunkText } from "powerdirector/plugin-sdk/reply-runtime";
import { shouldLogVerbose } from "powerdirector/plugin-sdk/runtime-env";
import { resolveWhatsAppOutboundTarget } from "./runtime-api";
import { sendMessageWhatsApp, sendPollWhatsApp } from "./send";

function trimLeadingWhitespace(text: string | undefined): string {
  return text?.trimStart() ?? "";
}

export const whatsappOutbound: ChannelOutboundAdapter = {
  deliveryMode: "gateway",
  chunker: chunkText,
  chunkerMode: "text",
  textChunkLimit: 4000,
  pollMaxOptions: 12,
  resolveTarget: ({ to, allowFrom, mode }) =>
    resolveWhatsAppOutboundTarget({ to, allowFrom, mode }),
  sendPayload: async (ctx) => {
    const text = trimLeadingWhitespace(ctx.payload.text);
    const hasMedia = resolveSendableOutboundReplyParts(ctx.payload).hasMedia;
    if (!text && !hasMedia) {
      return createEmptyChannelResult("whatsapp");
    }
    return await sendTextMediaPayload({
      channel: "whatsapp",
      ctx: {
        ...ctx,
        payload: {
          ...ctx.payload,
          text,
        },
      },
      adapter: whatsappOutbound,
    });
  },
  ...createAttachedChannelResultAdapter({
    channel: "whatsapp",
    sendText: async ({ cfg, to, text, accountId, deps, gifPlayback }) => {
      const normalizedText = trimLeadingWhitespace(text);
      if (!normalizedText) {
        return createEmptyChannelResult("whatsapp");
      }
      const send =
        resolveOutboundSendDep<typeof import("./send").sendMessageWhatsApp>(deps, "whatsapp") ??
        (await import("./send")).sendMessageWhatsApp;
      return await send(to, normalizedText, {
        verbose: false,
        cfg,
        accountId: accountId ?? undefined,
        gifPlayback,
      });
    },
    sendMedia: async ({
      cfg,
      to,
      text,
      mediaUrl,
      mediaLocalRoots,
      accountId,
      deps,
      gifPlayback,
    }) => {
      const normalizedText = trimLeadingWhitespace(text);
      const send =
        resolveOutboundSendDep<typeof import("./send").sendMessageWhatsApp>(deps, "whatsapp") ??
        (await import("./send")).sendMessageWhatsApp;
      return await send(to, normalizedText, {
        verbose: false,
        cfg,
        mediaUrl,
        mediaLocalRoots,
        accountId: accountId ?? undefined,
        gifPlayback,
      });
    },
    sendPoll: async ({ cfg, to, poll, accountId }) =>
      await sendPollWhatsApp(to, poll, {
        verbose: shouldLogVerbose(),
        accountId: accountId ?? undefined,
        cfg,
      }),
  }),
};
