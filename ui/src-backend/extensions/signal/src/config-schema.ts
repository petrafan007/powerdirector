import { buildChannelConfigSchema, SignalConfigSchema } from "@/src-backend/plugin-sdk/signal-core";

export const SignalChannelConfigSchema = buildChannelConfigSchema(SignalConfigSchema);
