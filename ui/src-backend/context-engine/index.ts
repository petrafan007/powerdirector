export type {
  ContextEngine,
  ContextEngineInfo,
  AssembleResult,
  CompactResult,
  IngestResult,
} from "./types";

export {
  registerContextEngine,
  getContextEngineFactory,
  listContextEngineIds,
  resolveContextEngine,
} from "./registry";
export type { ContextEngineFactory } from "./registry";

export { LegacyContextEngine, registerLegacyContextEngine } from "./legacy";
export { delegateCompactionToRuntime } from "./delegate";

export { ensureContextEnginesInitialized } from "./init";
