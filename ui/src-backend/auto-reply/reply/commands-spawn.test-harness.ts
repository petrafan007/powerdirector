import type { PowerDirectorConfig } from "../../config/config";
import type { MsgContext } from "../templating";
import { buildCommandTestParams as buildBaseCommandTestParams } from "./commands.test-harness";

export function buildCommandTestParams(
  commandBody: string,
  cfg: PowerDirectorConfig,
  ctxOverrides?: Partial<MsgContext>,
) {
  return buildBaseCommandTestParams(commandBody, cfg, ctxOverrides);
}
