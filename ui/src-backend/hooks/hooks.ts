export * from "./internal-hooks";

export type HookEventType = import("./internal-hooks").InternalHookEventType;
export type HookEvent = import("./internal-hooks").InternalHookEvent;
export type HookHandler = import("./internal-hooks").InternalHookHandler;

export {
  registerInternalHook as registerHook,
  unregisterInternalHook as unregisterHook,
  clearInternalHooks as clearHooks,
  getRegisteredEventKeys as getRegisteredHookEventKeys,
  triggerInternalHook as triggerHook,
  createInternalHookEvent as createHookEvent,
} from "./internal-hooks";
