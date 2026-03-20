import { buildChannelConfigSchema, IMessageConfigSchema } from "@/src-backend/plugin-sdk/imessage-core";

export const IMessageChannelConfigSchema = buildChannelConfigSchema(IMessageConfigSchema);
