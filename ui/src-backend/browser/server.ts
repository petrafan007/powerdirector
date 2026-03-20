import type { Server } from "node:http";
import express from "express";
import { loadConfig } from "../config/config";
import { createSubsystemLogger } from "../logging/subsystem";
import { resolveBrowserConfig } from "./config";
import { ensureBrowserControlAuth, resolveBrowserControlAuth } from "./control-auth";
import { registerBrowserRoutes } from "./routes/index";
import type { BrowserRouteRegistrar } from "./routes/types";
import { createBrowserRuntimeState, stopBrowserRuntime } from "./runtime-lifecycle";
import { type BrowserServerState, createBrowserRouteContext } from "./server-context";
import {
  installBrowserAuthMiddleware,
  installBrowserCommonMiddleware,
} from "./server-middleware";

let state: BrowserServerState | null = null;
const log = createSubsystemLogger("browser");
const logServer = log.child("server");

export async function startBrowserControlServerFromConfig(): Promise<BrowserServerState | null> {
  if (state) {
    return state;
  }

  const cfg = loadConfig();
  const resolved = resolveBrowserConfig(cfg.browser, cfg);
  if (!resolved.enabled) {
    return null;
  }

  let browserAuth = resolveBrowserControlAuth(cfg);
  let browserAuthBootstrapFailed = false;
  try {
    const ensured = await ensureBrowserControlAuth({ cfg });
    browserAuth = ensured.auth;
    if (ensured.generatedToken) {
      logServer.info("No browser auth configured; generated gateway.auth.token automatically.");
    }
  } catch (err) {
    logServer.warn(`failed to auto-configure browser auth: ${String(err)}`);
    browserAuthBootstrapFailed = true;
  }

  // Fail closed: if auth bootstrap failed and no explicit auth is available,
  // do not start the browser control HTTP server.
  if (browserAuthBootstrapFailed && !browserAuth.token && !browserAuth.password) {
    logServer.error(
      "browser control startup aborted: authentication bootstrap failed and no fallback auth is configured.",
    );
    return null;
  }

  const app = express();
  installBrowserCommonMiddleware(app);
  installBrowserAuthMiddleware(app, browserAuth);

  const ctx = createBrowserRouteContext({
    getState: () => state,
    refreshConfigFromDisk: true,
  });
  registerBrowserRoutes(app as unknown as BrowserRouteRegistrar, ctx);

  const port = resolved.controlPort;
  const server = await new Promise<Server>((resolve, reject) => {
    const s = app.listen(port, "127.0.0.1", () => resolve(s));
    s.once("error", reject);
  }).catch((err) => {
    logServer.error(`powerdirector browser server failed to bind 127.0.0.1:${port}: ${String(err)}`);
    return null;
  });

  if (!server) {
    return null;
  }

  state = await createBrowserRuntimeState({
    server,
    port,
    resolved,
    onWarn: (message) => logServer.warn(message),
  });

  const authMode = browserAuth.token ? "token" : browserAuth.password ? "password" : "off";
  logServer.info(`Browser control listening on http://127.0.0.1:${port}/ (auth=${authMode})`);
  return state;
}

export async function stopBrowserControlServer(): Promise<void> {
  const current = state;
  await stopBrowserRuntime({
    current,
    getState: () => state,
    clearState: () => {
      state = null;
    },
    closeServer: true,
    onWarn: (message) => logServer.warn(message),
  });
}
