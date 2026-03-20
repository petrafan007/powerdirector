import type { OutboundSendDeps } from "../infra/outbound/send-deps";
import { createLazyRuntimeSurface } from "../shared/lazy-runtime";
import { createOutboundSendDepsFromCliSource } from "./outbound-send-mapping";

/**
 * Lazy-loaded per-channel send functions, keyed by channel ID.
 * Values are proxy functions that dynamically import the real module on first use.
 */
export type CliDeps = { [channelId: string]: unknown };
type RuntimeSend = {
  sendMessage: (...args: unknown[]) => Promise<unknown>;
};
type RuntimeSendModule = {
  runtimeSend: RuntimeSend;
};

// Per-channel module caches for lazy loading.
const senderCache = new Map<string, Promise<RuntimeSend>>();

/**
 * Create a lazy-loading send function proxy for a channel.
 * The channel's module is loaded on first call and cached for reuse.
 */
function createLazySender(
  channelId: string,
  loader: () => Promise<RuntimeSendModule>,
): (...args: unknown[]) => Promise<unknown> {
  const loadRuntimeSend = createLazyRuntimeSurface(loader, ({ runtimeSend }) => runtimeSend);
  return async (...args: unknown[]) => {
    let cached = senderCache.get(channelId);
    if (!cached) {
      cached = loadRuntimeSend();
      senderCache.set(channelId, cached);
    }
    const runtimeSend = await cached;
    return await runtimeSend.sendMessage(...args);
  };
}

export function createDefaultDeps(): CliDeps {
  return {
    whatsapp: createLazySender(
      "whatsapp",
      () => import("./send-runtime/whatsapp") as Promise<RuntimeSendModule>,
    ),
    telegram: createLazySender(
      "telegram",
      () => import("./send-runtime/telegram") as Promise<RuntimeSendModule>,
    ),
    discord: createLazySender(
      "discord",
      () => import("./send-runtime/discord") as Promise<RuntimeSendModule>,
    ),
    slack: createLazySender(
      "slack",
      () => import("./send-runtime/slack") as Promise<RuntimeSendModule>,
    ),
    signal: createLazySender(
      "signal",
      () => import("./send-runtime/signal") as Promise<RuntimeSendModule>,
    ),
    imessage: createLazySender(
      "imessage",
      () => import("./send-runtime/imessage") as Promise<RuntimeSendModule>,
    ),
  };
}

export function createOutboundSendDeps(deps: CliDeps): OutboundSendDeps {
  return createOutboundSendDepsFromCliSource(deps);
}

export { logWebSelfId } from "../plugins/runtime/runtime-whatsapp-boundary";
