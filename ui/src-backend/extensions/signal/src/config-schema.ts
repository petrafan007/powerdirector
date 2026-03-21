import { buildChannelConfigSchema, SignalConfigSchema } from "powerdirector/plugin-sdk/signal-core";

export const SignalChannelConfigSchema = buildChannelConfigSchema(SignalConfigSchema);
