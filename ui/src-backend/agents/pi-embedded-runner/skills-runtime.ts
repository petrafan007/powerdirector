import type { PowerDirectorConfig } from "../../config/config";
import { loadWorkspaceSkillEntries, type SkillEntry, type SkillSnapshot } from "../skills";

export function resolveEmbeddedRunSkillEntries(params: {
  workspaceDir: string;
  config?: PowerDirectorConfig;
  skillsSnapshot?: SkillSnapshot;
}): {
  shouldLoadSkillEntries: boolean;
  skillEntries: SkillEntry[];
} {
  const shouldLoadSkillEntries = !params.skillsSnapshot || !params.skillsSnapshot.resolvedSkills;
  return {
    shouldLoadSkillEntries,
    skillEntries: shouldLoadSkillEntries
      ? loadWorkspaceSkillEntries(params.workspaceDir, { config: params.config })
      : [],
  };
}
