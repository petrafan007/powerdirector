import type { BrowserRouteContext } from '../server-context';
import { registerBrowserAgentRoutes } from './agent';
import { registerBrowserBasicRoutes } from './basic';
import { registerBrowserTabRoutes } from './tabs';
import type { BrowserRouteRegistrar } from './types';

export function registerBrowserRoutes(app: BrowserRouteRegistrar, ctx: BrowserRouteContext) {
  registerBrowserBasicRoutes(app, ctx);
  registerBrowserTabRoutes(app, ctx);
  registerBrowserAgentRoutes(app, ctx);
}
