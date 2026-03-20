import type { PowerDirectorConfig } from "../config/config";
export { shouldRequireGatewayTokenForInstall } from "../gateway/auth-install-policy";
import { readGatewayTokenEnv } from "../gateway/credentials";
import { resolveConfiguredSecretInputWithFallback } from "../gateway/resolve-configured-secret-input-string";

export async function resolveGatewayAuthTokenForService(
  cfg: PowerDirectorConfig,
  env: NodeJS.ProcessEnv,
): Promise<{ token?: string; unavailableReason?: string }> {
  const resolved = await resolveConfiguredSecretInputWithFallback({
    config: cfg,
    env,
    value: cfg.gateway?.auth?.token,
    path: "gateway.auth.token",
    unresolvedReasonStyle: "detailed",
    readFallback: () => readGatewayTokenEnv(env),
  });
  if (resolved.value) {
    return { token: resolved.value };
  }
  if (!resolved.secretRefConfigured) {
    return {};
  }
  if (resolved.unresolvedRefReason?.includes("resolved to an empty value")) {
    return { unavailableReason: resolved.unresolvedRefReason };
  }
  return {
    unavailableReason: `gateway.auth.token SecretRef is configured but unresolved (${resolved.unresolvedRefReason ?? "unknown reason"}).`,
  };
}
