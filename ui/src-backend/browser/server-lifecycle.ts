import type { ResolvedBrowserConfig } from './config';
import { resolveProfile } from './config';
import { ensureChromeExtensionRelayServer } from './extension-relay';
import {
  type BrowserServerState,
  createBrowserRouteContext,
  listKnownProfileNames,
} from './server-context';

export async function ensureExtensionRelayForProfiles(params: {
  resolved: ResolvedBrowserConfig;
  onWarn: (message: string) => void;
}) {
  for (const name of Object.keys(params.resolved.profiles)) {
    const profile = resolveProfile(params.resolved, name);
    if (!profile || profile.driver !== "extension") {
      continue;
    }
    await ensureChromeExtensionRelayServer({ cdpUrl: profile.cdpUrl }).catch((err) => {
      params.onWarn(`Chrome extension relay init failed for profile "${name}": ${String(err)}`);
    });
  }
}

export async function stopKnownBrowserProfiles(params: {
  getState: () => BrowserServerState | null;
  onWarn: (message: string) => void;
}) {
  const current = params.getState();
  if (!current) {
    return;
  }
  const ctx = createBrowserRouteContext({
    getState: params.getState,
    refreshConfigFromDisk: true,
  });
  try {
    for (const name of listKnownProfileNames(current)) {
      try {
        await ctx.forProfile(name).stopRunningBrowser();
      } catch {
        // ignore
      }
    }
  } catch (err) {
    params.onWarn(`powerdirector browser stop failed: ${String(err)}`);
  }
}
