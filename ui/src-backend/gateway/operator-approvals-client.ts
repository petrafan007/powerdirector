import type { PowerDirectorConfig } from "../config/config";
import { GATEWAY_CLIENT_MODES, GATEWAY_CLIENT_NAMES } from "../utils/message-channel";
import { buildGatewayConnectionDetails } from "./call";
import { GatewayClient, type GatewayClientOptions } from "./client";
import { resolveGatewayConnectionAuth } from "./connection-auth";

export async function createOperatorApprovalsGatewayClient(
  params: Pick<
    GatewayClientOptions,
    "clientDisplayName" | "onClose" | "onConnectError" | "onEvent" | "onHelloOk"
  > & {
    config: PowerDirectorConfig;
    gatewayUrl?: string;
  },
): Promise<GatewayClient> {
  const { url: gatewayUrl, urlSource } = buildGatewayConnectionDetails({
    config: params.config,
    url: params.gatewayUrl,
  });
  const gatewayUrlOverrideSource =
    urlSource === "cli --url"
      ? "cli"
      : urlSource === "env POWERDIRECTOR_GATEWAY_URL"
        ? "env"
        : undefined;
  const auth = await resolveGatewayConnectionAuth({
    config: params.config,
    env: process.env,
    urlOverride: gatewayUrlOverrideSource ? gatewayUrl : undefined,
    urlOverrideSource: gatewayUrlOverrideSource,
  });

  return new GatewayClient({
    url: gatewayUrl,
    token: auth.token,
    password: auth.password,
    clientName: GATEWAY_CLIENT_NAMES.GATEWAY_CLIENT,
    clientDisplayName: params.clientDisplayName,
    mode: GATEWAY_CLIENT_MODES.BACKEND,
    scopes: ["operator.approvals"],
    onEvent: params.onEvent,
    onHelloOk: params.onHelloOk,
    onConnectError: params.onConnectError,
    onClose: params.onClose,
  });
}
