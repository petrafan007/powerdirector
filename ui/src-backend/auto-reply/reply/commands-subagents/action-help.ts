import type { CommandHandlerResult } from "../commands-types";
import { buildSubagentsHelp, stopWithText } from "./shared";

export function handleSubagentsHelpAction(): CommandHandlerResult {
  return stopWithText(buildSubagentsHelp());
}
