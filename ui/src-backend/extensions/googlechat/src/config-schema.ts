import { buildChannelConfigSchema, GoogleChatConfigSchema } from "../runtime-api";

export const GoogleChatChannelConfigSchema = buildChannelConfigSchema(GoogleChatConfigSchema);
