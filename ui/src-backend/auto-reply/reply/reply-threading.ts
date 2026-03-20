import { getChannelPlugin, normalizeChannelId } from "../../channels/plugins/index";
import type { PowerDirectorConfig } from "../../config/config";
import type { ReplyToMode } from "../../config/types";
import type { OriginatingChannelType } from "../templating";
import type { ReplyPayload } from "../types";

export function resolveReplyToMode(
  cfg: PowerDirectorConfig,
  channel?: OriginatingChannelType,
  accountId?: string | null,
  chatType?: string | null,
): ReplyToMode {
  const provider = normalizeChannelId(channel);
  if (!provider) {
    return "all";
  }
  const resolved = getChannelPlugin(provider)?.threading?.resolveReplyToMode?.({
    cfg,
    accountId,
    chatType,
  });
  return resolved ?? "all";
}

export function createReplyToModeFilter(
  mode: ReplyToMode,
  opts: { allowExplicitReplyTagsWhenOff?: boolean } = {},
) {
  let hasThreaded = false;
  return (payload: ReplyPayload): ReplyPayload => {
    if (!payload.replyToId) {
      return payload;
    }
    if (mode === "off") {
      const isExplicit = Boolean(payload.replyToTag) || Boolean(payload.replyToCurrent);
      if (opts.allowExplicitReplyTagsWhenOff && isExplicit) {
        return payload;
      }
      return { ...payload, replyToId: undefined };
    }
    if (mode === "all") {
      return payload;
    }
    if (hasThreaded) {
      return { ...payload, replyToId: undefined };
    }
    hasThreaded = true;
    return payload;
  };
}

export function createReplyToModeFilterForChannel(
  mode: ReplyToMode,
  channel?: OriginatingChannelType,
) {
  const provider = normalizeChannelId(channel);
  const normalized = typeof channel === "string" ? channel.trim().toLowerCase() : undefined;
  const isWebchat = normalized === "webchat";
  // Default: allow explicit reply tags/directives even when replyToMode is "off".
  // Unknown channels fail closed; internal webchat stays allowed.
  const threading = provider ? getChannelPlugin(provider)?.threading : undefined;
  const allowExplicitReplyTagsWhenOff = provider
    ? (threading?.allowExplicitReplyTagsWhenOff ?? threading?.allowTagsWhenOff ?? true)
    : isWebchat;
  return createReplyToModeFilter(mode, {
    allowExplicitReplyTagsWhenOff,
  });
}
