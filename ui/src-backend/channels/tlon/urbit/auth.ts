// @ts-nocheck
import { UrbitAuthError } from './errors';
import { urbitFetch, UrbitFetchOptions } from './fetch';
import { SsrFPolicy, LookupFn } from './types';

export type UrbitAuthenticateOptions = {
  ssrfPolicy?: SsrFPolicy;
  lookupFn?: LookupFn;
  timeoutMs?: number;
};

export async function authenticate(
  url: string,
  code: string,
  options: UrbitAuthenticateOptions = {},
): Promise<string> {
  const { response, release } = await urbitFetch({
    baseUrl: url,
    path: "/~/login",
    init: {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ password: code }).toString(),
    },
    timeoutMs: options.timeoutMs ?? 15_000,
    auditContext: "tlon-urbit-login",
  });

  try {
    if (!response.ok) {
      throw new UrbitAuthError("auth_failed", `Login failed with status ${response.status}`);
    }

    // Some Urbit setups require the response body to be read before cookie headers finalize.
    await response.text().catch(() => {});
    const cookie = response.headers.get("set-cookie");
    if (!cookie) {
      throw new UrbitAuthError("missing_cookie", "No authentication cookie received");
    }
    return cookie;
  } finally {
    await release();
  }
}
