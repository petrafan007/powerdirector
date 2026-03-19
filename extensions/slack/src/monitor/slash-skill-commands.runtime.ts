import { listSkillCommandsForAgents as listSkillCommandsForAgentsImpl } from "powerdirector/plugin-sdk/reply-runtime";

type ListSkillCommandsForAgents =
  typeof import("powerdirector/plugin-sdk/reply-runtime").listSkillCommandsForAgents;

export function listSkillCommandsForAgents(
  ...args: Parameters<ListSkillCommandsForAgents>
): ReturnType<ListSkillCommandsForAgents> {
  return listSkillCommandsForAgentsImpl(...args);
}
