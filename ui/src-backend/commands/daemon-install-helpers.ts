import {
  loadAuthProfileStoreForSecretsRuntime,
  type AuthProfileStore,
} from "../agents/auth-profiles";
import { formatCliCommand } from "../cli/command-format";
import { collectConfigServiceEnvVars } from "../config/env-vars";
import type { PowerDirectorConfig } from "../config/types";
import { resolveGatewayLaunchAgentLabel } from "../daemon/constants";
import { resolveGatewayProgramArguments } from "../daemon/program-args";
import { buildServiceEnvironment } from "../daemon/service-env";
import {
  emitDaemonInstallRuntimeWarning,
  resolveDaemonInstallRuntimeInputs,
  resolveDaemonNodeBinDir,
} from "./daemon-install-plan.shared";
import type { DaemonInstallWarnFn } from "./daemon-install-runtime-warning";
import type { GatewayDaemonRuntime } from "./daemon-runtime";

export { resolveGatewayDevMode } from "./daemon-install-plan.shared";

export type GatewayInstallPlan = {
  programArguments: string[];
  workingDirectory?: string;
  environment: Record<string, string | undefined>;
};

function collectAuthProfileServiceEnvVars(params: {
  env: Record<string, string | undefined>;
  authStore?: AuthProfileStore;
}): Record<string, string> {
  const authStore = params.authStore ?? loadAuthProfileStoreForSecretsRuntime();
  const entries: Record<string, string> = {};

  for (const credential of Object.values(authStore.profiles)) {
    const ref =
      credential.type === "api_key"
        ? credential.keyRef
        : credential.type === "token"
          ? credential.tokenRef
          : undefined;
    if (!ref || ref.source !== "env") {
      continue;
    }
    const value = params.env[ref.id]?.trim();
    if (!value) {
      continue;
    }
    entries[ref.id] = value;
  }

  return entries;
}

export async function buildGatewayInstallPlan(params: {
  env: Record<string, string | undefined>;
  port: number;
  runtime: GatewayDaemonRuntime;
  devMode?: boolean;
  nodePath?: string;
  warn?: DaemonInstallWarnFn;
  /** Full config to extract env vars from (env vars + inline env keys). */
  config?: PowerDirectorConfig;
  authStore?: AuthProfileStore;
}): Promise<GatewayInstallPlan> {
  const { devMode, nodePath } = await resolveDaemonInstallRuntimeInputs({
    env: params.env,
    runtime: params.runtime,
    devMode: params.devMode,
    nodePath: params.nodePath,
  });
  const { programArguments, workingDirectory } = await resolveGatewayProgramArguments({
    port: params.port,
    dev: devMode,
    runtime: params.runtime,
    nodePath,
  });
  await emitDaemonInstallRuntimeWarning({
    env: params.env,
    runtime: params.runtime,
    programArguments,
    warn: params.warn,
    title: "Gateway runtime",
  });
  const serviceEnvironment = buildServiceEnvironment({
    env: params.env,
    port: params.port,
    launchdLabel:
      process.platform === "darwin"
        ? resolveGatewayLaunchAgentLabel(params.env.POWERDIRECTOR_PROFILE)
        : undefined,
    // Keep npm/pnpm available to the service when the selected daemon node comes from
    // a version-manager bin directory that isn't covered by static PATH guesses.
    extraPathDirs: resolveDaemonNodeBinDir(nodePath),
  });

  // Merge config env vars into the service environment (vars + inline env keys).
  // Config env vars are added first so service-specific vars take precedence.
  const environment: Record<string, string | undefined> = {
    ...collectConfigServiceEnvVars(params.config),
    ...collectAuthProfileServiceEnvVars({
      env: params.env,
      authStore: params.authStore,
    }),
  };
  Object.assign(environment, serviceEnvironment);

  return { programArguments, workingDirectory, environment };
}

export function gatewayInstallErrorHint(platform = process.platform): string {
  return platform === "win32"
    ? "Tip: native Windows now falls back to a per-user Startup-folder login item when Scheduled Task creation is denied; if install still fails, rerun from an elevated PowerShell or skip service install."
    : `Tip: rerun \`${formatCliCommand("powerdirector gateway install")}\` after fixing the error.`;
}
