// Canonical shared prelude for channel-oriented plugin SDK surfaces.
// Keep `core` and channel-specific SDK entrypoints derived from this module
// so bundled channel entrypoints do not drift across overlapping exports.
export type { ChannelPlugin } from "../channels/plugins/types.plugin";
export type { ChannelMessageActionContext } from "../channels/plugins/types";
export type { PluginRuntime } from "../plugins/runtime/types";
export type { PowerDirectorPluginApi } from "../plugins/types";

export { emptyPluginConfigSchema } from "../plugins/config-schema";

export { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../routing/session-key";

export {
  applyAccountNameToChannelSection,
  migrateBaseNameToDefaultAccount,
} from "../channels/plugins/setup-helpers";
export { buildChannelConfigSchema } from "../channels/plugins/config-schema";
export {
  deleteAccountFromConfigSection,
  setAccountEnabledInConfigSection,
} from "../channels/plugins/config-helpers";
export { formatPairingApproveHint } from "../channels/plugins/helpers";
export { PAIRING_APPROVED_MESSAGE } from "../channels/plugins/pairing-message";

export { getChatChannelMeta } from "../channels/registry";
