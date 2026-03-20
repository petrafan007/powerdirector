import { getActiveSkillEnvKeys as getActiveSkillEnvKeysImpl } from "./env-overrides";

type GetActiveSkillEnvKeys = typeof import("./env-overrides").getActiveSkillEnvKeys;

export function getActiveSkillEnvKeys(
  ...args: Parameters<GetActiveSkillEnvKeys>
): ReturnType<GetActiveSkillEnvKeys> {
  return getActiveSkillEnvKeysImpl(...args);
}
