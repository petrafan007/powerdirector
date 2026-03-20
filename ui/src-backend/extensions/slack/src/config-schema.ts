import { buildChannelConfigSchema, SlackConfigSchema } from "@/src-backend/plugin-sdk/slack-core";

export const SlackChannelConfigSchema = buildChannelConfigSchema(SlackConfigSchema);
