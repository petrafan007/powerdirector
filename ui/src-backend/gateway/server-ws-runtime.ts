import type { WebSocketServer } from "ws";
import type { createSubsystemLogger } from '../logging/subsystem';
import type { AuthRateLimiter } from './auth-rate-limit';
import type { ResolvedGatewayAuth } from './auth';
import type { GatewayRequestContext, GatewayRequestHandlers } from './server-methods/types';
import { attachGatewayWsConnectionHandler } from './server/ws-connection';
import type { GatewayWsClient } from './server/ws-types';

export function attachGatewayWsHandlers(params: {
  wss: WebSocketServer;
  clients: Set<GatewayWsClient>;
  port: number;
  gatewayHost?: string;
  canvasHostEnabled: boolean;
  canvasHostServerPort?: number;
  resolvedAuth: ResolvedGatewayAuth;
  /** Optional rate limiter for auth brute-force protection. */
  rateLimiter?: AuthRateLimiter;
  gatewayMethods: string[];
  events: string[];
  logGateway: ReturnType<typeof createSubsystemLogger>;
  logHealth: ReturnType<typeof createSubsystemLogger>;
  logWsControl: ReturnType<typeof createSubsystemLogger>;
  extraHandlers: GatewayRequestHandlers;
  broadcast: (
    event: string,
    payload: unknown,
    opts?: {
      dropIfSlow?: boolean;
      stateVersion?: { presence?: number; health?: number };
    },
  ) => void;
  context: GatewayRequestContext;
}) {
  attachGatewayWsConnectionHandler({
    wss: params.wss,
    clients: params.clients,
    port: params.port,
    gatewayHost: params.gatewayHost,
    canvasHostEnabled: params.canvasHostEnabled,
    canvasHostServerPort: params.canvasHostServerPort,
    resolvedAuth: params.resolvedAuth,
    rateLimiter: params.rateLimiter,
    gatewayMethods: params.gatewayMethods,
    events: params.events,
    logGateway: params.logGateway,
    logHealth: params.logHealth,
    logWsControl: params.logWsControl,
    extraHandlers: params.extraHandlers,
    broadcast: params.broadcast,
    buildRequestContext: () => params.context,
  });
}
