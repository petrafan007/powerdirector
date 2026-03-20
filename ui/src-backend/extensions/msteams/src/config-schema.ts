import { buildChannelConfigSchema, MSTeamsConfigSchema } from "../runtime-api";

export const MSTeamsChannelConfigSchema = buildChannelConfigSchema(MSTeamsConfigSchema);
