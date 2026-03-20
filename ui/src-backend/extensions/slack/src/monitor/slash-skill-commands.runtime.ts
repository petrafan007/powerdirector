import { listSkillCommandsForAgents as listSkillCommandsForAgentsImpl } from "@/src-backend/plugin-sdk/reply-runtime";

type ListSkillCommandsForAgents =
  typeof import("@/src-backend/plugin-sdk/reply-runtime").listSkillCommandsForAgents;

export function listSkillCommandsForAgents(
  ...args: Parameters<ListSkillCommandsForAgents>
): ReturnType<ListSkillCommandsForAgents> {
  return listSkillCommandsForAgentsImpl(...args);
}
