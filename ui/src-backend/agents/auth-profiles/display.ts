import type { PowerDirectorConfig } from "../../config/config";
import type { AuthProfileStore } from "./types";

export function resolveAuthProfileDisplayLabel(params: {
  cfg?: PowerDirectorConfig;
  store: AuthProfileStore;
  profileId: string;
}): string {
  const { cfg, store, profileId } = params;
  const profile = store.profiles[profileId];
  const configEmail = cfg?.auth?.profiles?.[profileId]?.email?.trim();
  const email = configEmail || (profile && "email" in profile ? profile.email?.trim() : undefined);
  if (email) {
    return `${profileId} (${email})`;
  }
  return profileId;
}
