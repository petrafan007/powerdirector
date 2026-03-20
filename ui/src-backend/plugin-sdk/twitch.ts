// Narrow plugin-sdk surface for the bundled twitch plugin.
// Keep this list additive and scoped to symbols used under extensions/twitch.

import { createOptionalChannelSetupSurface } from "./channel-setup";

export type { ReplyPayload } from "../auto-reply/types";
export { buildChannelConfigSchema } from "../channels/plugins/config-schema";
export type {
  ChannelGatewayContext,
  ChannelOutboundAdapter,
  ChannelOutboundContext,
  ChannelResolveKind,
  ChannelResolveResult,
  ChannelStatusAdapter,
} from "../channels/plugins/types.adapters";
export type {
  BaseProbeResult,
  ChannelAccountSnapshot,
  ChannelCapabilities,
  ChannelLogSink,
  ChannelMessageActionAdapter,
  ChannelMessageActionContext,
  ChannelMeta,
  ChannelStatusIssue,
} from "../channels/plugins/types";
export type { ChannelPlugin } from "../channels/plugins/types.plugin";
export { createChannelReplyPipeline } from "./channel-reply-pipeline";
export type { PowerDirectorConfig } from "../config/config";
export { MarkdownConfigSchema } from "../config/zod-schema.core";
export type { OutboundDeliveryResult } from "../infra/outbound/deliver";
export { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "./account-id";
export { emptyPluginConfigSchema } from "../plugins/config-schema";
export type { PluginRuntime } from "../plugins/runtime/types";
export type { PowerDirectorPluginApi } from "../plugins/types";
export type { RuntimeEnv } from "../runtime";
export { formatDocsLink } from "../terminal/links";
export type { WizardPrompter } from "../wizard/prompts";

const twitchSetup = createOptionalChannelSetupSurface({
  channel: "twitch",
  label: "Twitch",
  npmSpec: "@powerdirector/twitch",
});

export const twitchSetupAdapter = twitchSetup.setupAdapter;
export const twitchSetupWizard = twitchSetup.setupWizard;
