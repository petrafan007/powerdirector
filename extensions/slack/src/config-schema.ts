import { buildChannelConfigSchema, SlackConfigSchema } from "powerdirector/plugin-sdk/slack-core";

export const SlackChannelConfigSchema = buildChannelConfigSchema(SlackConfigSchema);
