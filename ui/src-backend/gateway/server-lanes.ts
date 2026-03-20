import { resolveAgentMaxConcurrent, resolveSubagentMaxConcurrent } from "../config/agent-limits";
import type { loadConfig } from "../config/config";
import { setCommandLaneConcurrency } from "../process/command-queue";
import { CommandLane } from "../process/lanes";

export function applyGatewayLaneConcurrency(cfg: ReturnType<typeof loadConfig>) {
  setCommandLaneConcurrency(CommandLane.Cron, cfg.cron?.maxConcurrentRuns ?? 1);
  setCommandLaneConcurrency(CommandLane.Main, resolveAgentMaxConcurrent(cfg));
  setCommandLaneConcurrency(CommandLane.Subagent, resolveSubagentMaxConcurrent(cfg));
}
