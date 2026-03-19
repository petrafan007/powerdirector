import { buildChannelConfigSchema, WhatsAppConfigSchema } from "powerdirector/plugin-sdk/whatsapp-core";

export const WhatsAppChannelConfigSchema = buildChannelConfigSchema(WhatsAppConfigSchema);
