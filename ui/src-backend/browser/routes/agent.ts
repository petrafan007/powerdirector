import type { BrowserRouteContext } from "../server-context";
import { registerBrowserAgentActRoutes } from "./agent.act";
import { registerBrowserAgentDebugRoutes } from "./agent.debug";
import { registerBrowserAgentSnapshotRoutes } from "./agent.snapshot";
import { registerBrowserAgentStorageRoutes } from "./agent.storage";
import type { BrowserRouteRegistrar } from "./types";

export function registerBrowserAgentRoutes(app: BrowserRouteRegistrar, ctx: BrowserRouteContext) {
  registerBrowserAgentSnapshotRoutes(app, ctx);
  registerBrowserAgentActRoutes(app, ctx);
  registerBrowserAgentDebugRoutes(app, ctx);
  registerBrowserAgentStorageRoutes(app, ctx);
}
