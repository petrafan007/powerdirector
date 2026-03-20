export type {
  ChannelAccountSnapshot,
  ChannelGatewayContext,
  ChannelMessageActionAdapter,
} from "../channels/plugins/types";
export type { PowerDirectorConfig } from "../config/config";
export type { DiscordAccountConfig, DiscordActionConfig } from "../config/types";
export type { DiscordConfig } from "../config/types.discord";
export type { DiscordPluralKitConfig } from "@/src-backend/extensions/discord/api";
export type { InspectedDiscordAccount } from "@/src-backend/extensions/discord/api";
export type { ResolvedDiscordAccount } from "@/src-backend/extensions/discord/api";
export type { DiscordSendComponents, DiscordSendEmbeds } from "@/src-backend/extensions/discord/api";
export type {
  ThreadBindingManager,
  ThreadBindingRecord,
  ThreadBindingTargetKind,
} from "@/src-backend/extensions/discord/runtime-api";
export type {
  ChannelConfiguredBindingProvider,
  ChannelConfiguredBindingConversationRef,
  ChannelConfiguredBindingMatch,
} from "../channels/plugins/types.adapters";
export type {
  ChannelMessageActionContext,
  ChannelPlugin,
  PowerDirectorPluginApi,
  PluginRuntime,
} from "./channel-plugin-common";
export {
  DEFAULT_ACCOUNT_ID,
  PAIRING_APPROVED_MESSAGE,
  applyAccountNameToChannelSection,
  buildChannelConfigSchema,
  deleteAccountFromConfigSection,
  emptyPluginConfigSchema,
  formatPairingApproveHint,
  getChatChannelMeta,
  migrateBaseNameToDefaultAccount,
  normalizeAccountId,
  setAccountEnabledInConfigSection,
} from "./channel-plugin-common";
export { formatDocsLink } from "../terminal/links";

export {
  projectCredentialSnapshotFields,
  resolveConfiguredFromCredentialStatuses,
} from "../channels/account-snapshot-fields";
export {
  resolveDefaultGroupPolicy,
  resolveOpenProviderRuntimeGroupPolicy,
} from "../config/runtime-group-policy";
export {
  listDiscordDirectoryGroupsFromConfig,
  listDiscordDirectoryPeersFromConfig,
} from "@/src-backend/extensions/discord/api";
export {
  resolveDiscordGroupRequireMention,
  resolveDiscordGroupToolPolicy,
} from "@/src-backend/extensions/discord/api";
export { DiscordConfigSchema } from "../config/zod-schema.providers-core";

export {
  buildComputedAccountStatusSnapshot,
  buildTokenChannelStatusSummary,
} from "./status-helpers";

export {
  createDiscordActionGate,
  listDiscordAccountIds,
  resolveDefaultDiscordAccountId,
} from "@/src-backend/extensions/discord/api";
export { inspectDiscordAccount } from "@/src-backend/extensions/discord/api";
export {
  looksLikeDiscordTargetId,
  normalizeDiscordMessagingTarget,
  normalizeDiscordOutboundTarget,
} from "@/src-backend/extensions/discord/api";
export { collectDiscordAuditChannelIds } from "@/src-backend/extensions/discord/runtime-api";
export { collectDiscordStatusIssues } from "@/src-backend/extensions/discord/api";
export {
  DISCORD_DEFAULT_INBOUND_WORKER_TIMEOUT_MS,
  DISCORD_DEFAULT_LISTENER_TIMEOUT_MS,
} from "@/src-backend/extensions/discord/runtime-api";
export { normalizeExplicitDiscordSessionKey } from "@/src-backend/extensions/discord/session-key-api";
export {
  autoBindSpawnedDiscordSubagent,
  getThreadBindingManager,
  listThreadBindingsBySessionKey,
  resolveThreadBindingIdleTimeoutMs,
  resolveThreadBindingInactivityExpiresAt,
  resolveThreadBindingMaxAgeExpiresAt,
  resolveThreadBindingMaxAgeMs,
  setThreadBindingIdleTimeoutBySessionKey,
  setThreadBindingMaxAgeBySessionKey,
  unbindThreadBindingsBySessionKey,
} from "@/src-backend/extensions/discord/runtime-api";
export { getGateway } from "@/src-backend/extensions/discord/runtime-api";
export { getPresence } from "@/src-backend/extensions/discord/runtime-api";
export { readDiscordComponentSpec } from "@/src-backend/extensions/discord/api";
export { resolveDiscordChannelId } from "@/src-backend/extensions/discord/api";
export {
  addRoleDiscord,
  auditDiscordChannelPermissions,
  banMemberDiscord,
  createChannelDiscord,
  createScheduledEventDiscord,
  createThreadDiscord,
  deleteChannelDiscord,
  deleteMessageDiscord,
  editChannelDiscord,
  editMessageDiscord,
  fetchChannelInfoDiscord,
  fetchChannelPermissionsDiscord,
  fetchMemberInfoDiscord,
  fetchMessageDiscord,
  fetchReactionsDiscord,
  fetchRoleInfoDiscord,
  fetchVoiceStatusDiscord,
  hasAnyGuildPermissionDiscord,
  kickMemberDiscord,
  listDiscordDirectoryGroupsLive,
  listDiscordDirectoryPeersLive,
  listGuildChannelsDiscord,
  listGuildEmojisDiscord,
  listPinsDiscord,
  listScheduledEventsDiscord,
  listThreadsDiscord,
  monitorDiscordProvider,
  moveChannelDiscord,
  pinMessageDiscord,
  probeDiscord,
  reactMessageDiscord,
  readMessagesDiscord,
  removeChannelPermissionDiscord,
  removeOwnReactionsDiscord,
  removeReactionDiscord,
  removeRoleDiscord,
  resolveDiscordChannelAllowlist,
  resolveDiscordUserAllowlist,
  searchMessagesDiscord,
  sendDiscordComponentMessage,
  sendMessageDiscord,
  sendPollDiscord,
  sendTypingDiscord,
  sendStickerDiscord,
  sendVoiceMessageDiscord,
  setChannelPermissionDiscord,
  timeoutMemberDiscord,
  unpinMessageDiscord,
  uploadEmojiDiscord,
  uploadStickerDiscord,
} from "@/src-backend/extensions/discord/runtime-api";
export { discordMessageActions } from "@/src-backend/extensions/discord/runtime-api";
