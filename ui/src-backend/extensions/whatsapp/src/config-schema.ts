import { buildChannelConfigSchema, WhatsAppConfigSchema } from "@/src-backend/plugin-sdk/whatsapp-core";

export const WhatsAppChannelConfigSchema = buildChannelConfigSchema(WhatsAppConfigSchema);
