export type { MatrixAuth, MatrixResolvedConfig } from "./client/types";
export { isBunRuntime } from "./client/runtime";
export {
  resolveMatrixConfig,
  resolveMatrixConfigForAccount,
  resolveMatrixAuth,
} from "./client/config";
export { createMatrixClient } from "./client/create-client";
export {
  resolveSharedMatrixClient,
  waitForMatrixSync,
  stopSharedClient,
  stopSharedClientForAccount,
} from "./client/shared";
