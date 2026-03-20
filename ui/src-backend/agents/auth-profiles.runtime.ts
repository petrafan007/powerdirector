import { ensureAuthProfileStore as ensureAuthProfileStoreImpl } from "./auth-profiles";

type EnsureAuthProfileStore = typeof import("./auth-profiles").ensureAuthProfileStore;

export function ensureAuthProfileStore(
  ...args: Parameters<EnsureAuthProfileStore>
): ReturnType<EnsureAuthProfileStore> {
  return ensureAuthProfileStoreImpl(...args);
}
