import { Routes } from "discord-api-types/v10";
import { resolveDiscordRest } from "./client";
import type { DiscordReactOpts } from "./send.types";

export async function sendTypingDiscord(channelId: string, opts: DiscordReactOpts = {}) {
  const rest = resolveDiscordRest(opts);
  await rest.post(Routes.channelTyping(channelId));
  return { ok: true, channelId };
}
