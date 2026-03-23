import { buildChannelConfigSchema, DiscordConfigSchema } from "powerdirector/plugin-sdk/discord-core";

export const DiscordChannelConfigSchema = buildChannelConfigSchema(DiscordConfigSchema);
