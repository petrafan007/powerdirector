import { withPluginRuntimeGatewayRequestScope } from "../plugins/runtime/gateway-request-scope";
import { formatControlPlaneActor, resolveControlPlaneActor } from "./control-plane-audit";
import { consumeControlPlaneWriteBudget } from "./control-plane-rate-limit";
import { ADMIN_SCOPE, authorizeOperatorScopesForMethod } from "./method-scopes";
import { ErrorCodes, errorShape } from "./protocol/index";
import { isRoleAuthorizedForMethod, parseGatewayRole } from "./role-policy";
import { agentHandlers } from "./server-methods/agent";
import { agentsHandlers } from "./server-methods/agents";
import { browserHandlers } from "./server-methods/browser";
import { channelsHandlers } from "./server-methods/channels";
import { chatHandlers } from "./server-methods/chat";
import { configHandlers } from "./server-methods/config";
import { connectHandlers } from "./server-methods/connect";
import { cronHandlers } from "./server-methods/cron";
import { deviceHandlers } from "./server-methods/devices";
import { doctorHandlers } from "./server-methods/doctor";
import { execApprovalsHandlers } from "./server-methods/exec-approvals";
import { healthHandlers } from "./server-methods/health";
import { logsHandlers } from "./server-methods/logs";
import { modelsHandlers } from "./server-methods/models";
import { nodePendingHandlers } from "./server-methods/nodes-pending";
import { nodeHandlers } from "./server-methods/nodes";
import { pushHandlers } from "./server-methods/push";
import { sendHandlers } from "./server-methods/send";
import { sessionsHandlers } from "./server-methods/sessions";
import { skillsHandlers } from "./server-methods/skills";
import { systemHandlers } from "./server-methods/system";
import { talkHandlers } from "./server-methods/talk";
import { toolsCatalogHandlers } from "./server-methods/tools-catalog";
import { ttsHandlers } from "./server-methods/tts";
import type { GatewayRequestHandlers, GatewayRequestOptions } from "./server-methods/types";
import { updateHandlers } from "./server-methods/update";
import { usageHandlers } from "./server-methods/usage";
import { voicewakeHandlers } from "./server-methods/voicewake";
import { webHandlers } from "./server-methods/web";
import { wizardHandlers } from "./server-methods/wizard";

const CONTROL_PLANE_WRITE_METHODS = new Set(["config.apply", "config.patch", "update.run"]);
function authorizeGatewayMethod(method: string, client: GatewayRequestOptions["client"]) {
  if (!client?.connect) {
    return null;
  }
  if (method === "health") {
    return null;
  }
  const roleRaw = client.connect.role ?? "operator";
  const role = parseGatewayRole(roleRaw);
  if (!role) {
    return errorShape(ErrorCodes.INVALID_REQUEST, `unauthorized role: ${roleRaw}`);
  }
  const scopes = client.connect.scopes ?? [];
  if (!isRoleAuthorizedForMethod(role, method)) {
    return errorShape(ErrorCodes.INVALID_REQUEST, `unauthorized role: ${role}`);
  }
  if (role === "node") {
    return null;
  }
  if (scopes.includes(ADMIN_SCOPE)) {
    return null;
  }
  const scopeAuth = authorizeOperatorScopesForMethod(method, scopes);
  if (!scopeAuth.allowed) {
    return errorShape(ErrorCodes.INVALID_REQUEST, `missing scope: ${scopeAuth.missingScope}`);
  }
  return null;
}

export const coreGatewayHandlers: GatewayRequestHandlers = {
  ...connectHandlers,
  ...logsHandlers,
  ...voicewakeHandlers,
  ...healthHandlers,
  ...channelsHandlers,
  ...chatHandlers,
  ...cronHandlers,
  ...deviceHandlers,
  ...doctorHandlers,
  ...execApprovalsHandlers,
  ...webHandlers,
  ...modelsHandlers,
  ...configHandlers,
  ...wizardHandlers,
  ...talkHandlers,
  ...toolsCatalogHandlers,
  ...ttsHandlers,
  ...skillsHandlers,
  ...sessionsHandlers,
  ...systemHandlers,
  ...updateHandlers,
  ...nodeHandlers,
  ...nodePendingHandlers,
  ...pushHandlers,
  ...sendHandlers,
  ...usageHandlers,
  ...agentHandlers,
  ...agentsHandlers,
  ...browserHandlers,
};

export async function handleGatewayRequest(
  opts: GatewayRequestOptions & { extraHandlers?: GatewayRequestHandlers },
): Promise<void> {
  const { req, respond, client, isWebchatConnect, context } = opts;
  const authError = authorizeGatewayMethod(req.method, client);
  if (authError) {
    respond(false, undefined, authError);
    return;
  }
  if (CONTROL_PLANE_WRITE_METHODS.has(req.method)) {
    const budget = consumeControlPlaneWriteBudget({ client });
    if (!budget.allowed) {
      const actor = resolveControlPlaneActor(client);
      context.logGateway.warn(
        `control-plane write rate-limited method=${req.method} ${formatControlPlaneActor(actor)} retryAfterMs=${budget.retryAfterMs} key=${budget.key}`,
      );
      respond(
        false,
        undefined,
        errorShape(
          ErrorCodes.UNAVAILABLE,
          `rate limit exceeded for ${req.method}; retry after ${Math.ceil(budget.retryAfterMs / 1000)}s`,
          {
            retryable: true,
            retryAfterMs: budget.retryAfterMs,
            details: {
              method: req.method,
              limit: "3 per 60s",
            },
          },
        ),
      );
      return;
    }
  }
  const handler = opts.extraHandlers?.[req.method] ?? coreGatewayHandlers[req.method];
  if (!handler) {
    respond(
      false,
      undefined,
      errorShape(ErrorCodes.INVALID_REQUEST, `unknown method: ${req.method}`),
    );
    return;
  }
  const invokeHandler = () =>
    handler({
      req,
      params: (req.params ?? {}) as Record<string, unknown>,
      client,
      isWebchatConnect,
      respond,
      context,
    });
  // All handlers run inside a request scope so that plugin runtime
  // subagent methods (e.g. context engine tools spawning sub-agents
  // during tool execution) can dispatch back into the gateway.
  await withPluginRuntimeGatewayRequestScope({ context, client, isWebchatConnect }, invokeHandler);
}
