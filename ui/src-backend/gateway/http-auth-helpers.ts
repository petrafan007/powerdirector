import type { IncomingMessage, ServerResponse } from "node:http";
import type { AuthRateLimiter } from './auth-rate-limit';
import { authorizeGatewayConnect, type ResolvedGatewayAuth } from './auth';
import { sendGatewayAuthFailure } from './http-common';
import { getBearerToken } from './http-utils';

export async function authorizeGatewayBearerRequestOrReply(params: {
  req: IncomingMessage;
  res: ServerResponse;
  auth: ResolvedGatewayAuth;
  trustedProxies?: string[];
  rateLimiter?: AuthRateLimiter;
}): Promise<boolean> {
  const token = getBearerToken(params.req);
  const authResult = await authorizeGatewayConnect({
    auth: params.auth,
    connectAuth: token ? { token, password: token } : null,
    req: params.req,
    trustedProxies: params.trustedProxies,
    rateLimiter: params.rateLimiter,
  });
  if (!authResult.ok) {
    sendGatewayAuthFailure(params.res, authResult);
    return false;
  }
  return true;
}
