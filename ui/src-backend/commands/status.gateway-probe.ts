import type { loadConfig } from "../config/config";
import { resolveGatewayProbeAuthSafe } from "../gateway/probe-auth";
export { pickGatewaySelfPresence } from "./gateway-presence";

export function resolveGatewayProbeAuthResolution(cfg: ReturnType<typeof loadConfig>): {
  auth: {
    token?: string;
    password?: string;
  };
  warning?: string;
} {
  return resolveGatewayProbeAuthSafe({
    cfg,
    mode: cfg.gateway?.mode === "remote" ? "remote" : "local",
    env: process.env,
  });
}

export function resolveGatewayProbeAuth(cfg: ReturnType<typeof loadConfig>): {
  token?: string;
  password?: string;
} {
  return resolveGatewayProbeAuthResolution(cfg).auth;
}
