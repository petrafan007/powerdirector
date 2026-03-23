// Legacy compat surface for external plugins that still depend on older
// broad plugin-sdk imports. Keep this file intentionally small.

const shouldWarnCompatImport =
  process.env.VITEST !== "true" &&
  process.env.NODE_ENV !== "test" &&
  process.env.POWERDIRECTOR_SUPPRESS_PLUGIN_SDK_COMPAT_WARNING !== "1";

if (shouldWarnCompatImport) {
  process.emitWarning(
    "powerdirector/plugin-sdk/compat is deprecated for new plugins. Migrate to focused powerdirector/plugin-sdk/<subpath> imports.",
    {
      code: "POWERDIRECTOR_PLUGIN_SDK_COMPAT_DEPRECATED",
      detail:
        "Bundled plugins must use scoped plugin-sdk subpaths. External plugins may keep compat temporarily while migrating.",
    },
  );
}

export { emptyPluginConfigSchema } from "../plugins/config-schema";
export { resolveControlCommandGate } from "../channels/command-gating";
export { delegateCompactionToRuntime } from "../context-engine/delegate";

export { createAccountStatusSink } from "./channel-lifecycle";
export { createPluginRuntimeStore } from "./runtime-store";
export { KeyedAsyncQueue } from "./keyed-async-queue";

export {
  createHybridChannelConfigAdapter,
  createHybridChannelConfigBase,
  createScopedAccountConfigAccessors,
  createScopedChannelConfigAdapter,
  createScopedChannelConfigBase,
  createScopedDmSecurityResolver,
  createTopLevelChannelConfigAdapter,
  createTopLevelChannelConfigBase,
  mapAllowFromEntries,
} from "./channel-config-helpers";
export { formatAllowFromLowercase, formatNormalizedAllowFromEntries } from "./allow-from";
export * from "./channel-config-schema";
export * from "./channel-policy";
export * from "./reply-history";
export * from "./directory-runtime";
export { mapAllowlistResolutionInputs } from "./allowlist-resolution";

export {
  resolveBlueBubblesGroupRequireMention,
  resolveBlueBubblesGroupToolPolicy,
} from "@/src-backend/extensions/bluebubbles/runtime-api";
export { collectBlueBubblesStatusIssues } from "../channels/plugins/status-issues/bluebubbles";
