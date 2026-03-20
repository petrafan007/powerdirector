// Shared process/runtime utilities for plugins. This is the public boundary for
// logger wiring, runtime env shims, and global verbose console helpers.

export type { RuntimeEnv } from "../runtime";
export { createNonExitingRuntime, defaultRuntime } from "../runtime";
export {
  danger,
  info,
  isVerbose,
  isYes,
  logVerbose,
  logVerboseConsole,
  setVerbose,
  setYes,
  shouldLogVerbose,
  success,
  warn,
} from "../globals";
export * from "../logging";
export { waitForAbortSignal } from "../infra/abort-signal";
export { registerUnhandledRejectionHandler } from "../infra/unhandled-rejections";
