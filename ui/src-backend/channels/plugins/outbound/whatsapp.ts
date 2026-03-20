import { chunkText } from "../../../auto-reply/chunk";
import { shouldLogVerbose } from "../../../globals";
import { sendPollWhatsApp } from "../../../web/outbound";
import { resolveWhatsAppOutboundTarget } from "../../../whatsapp/resolve-outbound-target";
import type { ChannelOutboundAdapter } from "../types";
import { sendTextMediaPayload } from "./direct-text-media";

export const whatsappOutbound: ChannelOutboundAdapter = {
  deliveryMode: "gateway",
  chunker: chunkText,
  chunkerMode: "text",
  textChunkLimit: 4000,
  pollMaxOptions: 12,
  resolveTarget: ({ to, allowFrom, mode }) =>
    resolveWhatsAppOutboundTarget({ to, allowFrom, mode }),
  sendPayload: async (ctx) =>
    await sendTextMediaPayload({ channel: "whatsapp", ctx, adapter: whatsappOutbound }),
  sendText: async ({ cfg, to, text, accountId, deps, gifPlayback }) => {
    const send =
      deps?.sendWhatsApp ?? (await import("../../../web/outbound")).sendMessageWhatsApp;
    const result = await send(to, text, {
      verbose: false,
      cfg,
      accountId: accountId ?? undefined,
      gifPlayback,
    });
    return { channel: "whatsapp", ...result };
  },
  sendMedia: async ({ cfg, to, text, mediaUrl, mediaLocalRoots, accountId, deps, gifPlayback }) => {
    const send =
      deps?.sendWhatsApp ?? (await import("../../../web/outbound")).sendMessageWhatsApp;
    const result = await send(to, text, {
      verbose: false,
      cfg,
      mediaUrl,
      mediaLocalRoots,
      accountId: accountId ?? undefined,
      gifPlayback,
    });
    return { channel: "whatsapp", ...result };
  },
  sendPoll: async ({ cfg, to, poll, accountId }) =>
    await sendPollWhatsApp(to, poll, {
      verbose: shouldLogVerbose(),
      accountId: accountId ?? undefined,
      cfg,
    }),
};
