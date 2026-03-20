import { listSubagentRunsForController } from "../../agents/subagent-registry";
import { logVerbose } from "../../globals";
import { handleSubagentsAgentsAction } from "./commands-subagents/action-agents";
import { handleSubagentsFocusAction } from "./commands-subagents/action-focus";
import { handleSubagentsHelpAction } from "./commands-subagents/action-help";
import { handleSubagentsInfoAction } from "./commands-subagents/action-info";
import { handleSubagentsKillAction } from "./commands-subagents/action-kill";
import { handleSubagentsListAction } from "./commands-subagents/action-list";
import { handleSubagentsLogAction } from "./commands-subagents/action-log";
import { handleSubagentsSendAction } from "./commands-subagents/action-send";
import { handleSubagentsSpawnAction } from "./commands-subagents/action-spawn";
import { handleSubagentsUnfocusAction } from "./commands-subagents/action-unfocus";
import {
  type SubagentsCommandContext,
  extractMessageText,
  resolveHandledPrefix,
  resolveRequesterSessionKey,
  resolveSubagentsAction,
  stopWithText,
} from "./commands-subagents/shared";
import type { CommandHandler } from "./commands-types";

export { extractMessageText };

export const handleSubagentsCommand: CommandHandler = async (params, allowTextCommands) => {
  if (!allowTextCommands) {
    return null;
  }

  const normalized = params.command.commandBodyNormalized;
  const handledPrefix = resolveHandledPrefix(normalized);
  if (!handledPrefix) {
    return null;
  }

  if (!params.command.isAuthorizedSender) {
    logVerbose(
      `Ignoring ${handledPrefix} from unauthorized sender: ${params.command.senderId || "<unknown>"}`,
    );
    return { shouldContinue: false };
  }

  const rest = normalized.slice(handledPrefix.length).trim();
  const restTokens = rest.split(/\s+/).filter(Boolean);
  const action = resolveSubagentsAction({ handledPrefix, restTokens });
  if (!action) {
    return handleSubagentsHelpAction();
  }

  const requesterKey =
    action === "spawn"
      ? resolveRequesterSessionKey(params, {
          preferCommandTarget: true,
        })
      : resolveRequesterSessionKey(params);
  if (!requesterKey) {
    return stopWithText("⚠️ Missing session key.");
  }

  const ctx: SubagentsCommandContext = {
    params,
    handledPrefix,
    requesterKey,
    runs: listSubagentRunsForController(requesterKey),
    restTokens,
  };

  switch (action) {
    case "help":
      return handleSubagentsHelpAction();
    case "agents":
      return handleSubagentsAgentsAction(ctx);
    case "focus":
      return await handleSubagentsFocusAction(ctx);
    case "unfocus":
      return await handleSubagentsUnfocusAction(ctx);
    case "list":
      return handleSubagentsListAction(ctx);
    case "kill":
      return await handleSubagentsKillAction(ctx);
    case "info":
      return handleSubagentsInfoAction(ctx);
    case "log":
      return await handleSubagentsLogAction(ctx);
    case "send":
      return await handleSubagentsSendAction(ctx, false);
    case "steer":
      return await handleSubagentsSendAction(ctx, true);
    case "spawn":
      return await handleSubagentsSpawnAction(ctx);
    default:
      return handleSubagentsHelpAction();
  }
};
