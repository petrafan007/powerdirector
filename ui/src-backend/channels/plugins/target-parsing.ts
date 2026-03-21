import { parseDiscordTarget } from "powerdirector/extensions/discord/api";
import { parseTelegramTarget } from "powerdirector/extensions/telegram/api";
import type { ChatType } from "../chat-type";
import { normalizeChatChannelId } from "../registry";
import { getChannelPlugin, normalizeChannelId } from "./registry";

export type ParsedChannelExplicitTarget = {
  to: string;
  threadId?: string | number;
  chatType?: ChatType;
};

function parseWithPlugin(
  rawChannel: string,
  rawTarget: string,
): ParsedChannelExplicitTarget | null {
  const channel = normalizeChatChannelId(rawChannel) ?? normalizeChannelId(rawChannel);
  if (!channel) {
    return null;
  }
  if (channel === "telegram") {
    const target = parseTelegramTarget(rawTarget);
    return {
      to: target.chatId,
      ...(target.messageThreadId != null ? { threadId: target.messageThreadId } : {}),
      ...(target.chatType === "unknown" ? {} : { chatType: target.chatType }),
    };
  }
  if (channel === "discord") {
    const target = parseDiscordTarget(rawTarget, { defaultKind: "channel" });
    if (!target) {
      return null;
    }
    return {
      to: target.id,
      chatType: target.kind === "user" ? "direct" : "channel",
    };
  }
  return getChannelPlugin(channel)?.messaging?.parseExplicitTarget?.({ raw: rawTarget }) ?? null;
}

export function parseExplicitTargetForChannel(
  channel: string,
  rawTarget: string,
): ParsedChannelExplicitTarget | null {
  return parseWithPlugin(channel, rawTarget);
}
