import type { PowerDirectorConfig } from "../../config/config";
import { resolveGatewayDriftCheckCredentialsFromConfig } from "../../gateway/credentials";

export function resolveGatewayTokenForDriftCheck(params: {
  cfg: PowerDirectorConfig;
  env?: NodeJS.ProcessEnv;
}) {
  void params.env;
  return resolveGatewayDriftCheckCredentialsFromConfig({ cfg: params.cfg }).token;
}
