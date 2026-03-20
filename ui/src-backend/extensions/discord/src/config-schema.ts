import { buildChannelConfigSchema, DiscordConfigSchema } from "@/src-backend/plugin-sdk/discord-core";

export const DiscordChannelConfigSchema = buildChannelConfigSchema(DiscordConfigSchema);
