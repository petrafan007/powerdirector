import { buildGatewayInstallPlan } from "../../commands/daemon-install-helpers";
import {
  DEFAULT_GATEWAY_DAEMON_RUNTIME,
  isGatewayDaemonRuntime,
} from "../../commands/daemon-runtime";
import { resolveGatewayInstallToken } from "../../commands/gateway-install-token";
import { readBestEffortConfig, resolveGatewayPort } from "../../config/config";
import { resolveGatewayService } from "../../daemon/service";
import { isNonFatalSystemdInstallProbeError } from "../../daemon/systemd";
import { defaultRuntime } from "../../runtime";
import { formatCliCommand } from "../command-format";
import { buildDaemonServiceSnapshot, installDaemonServiceAndEmit } from "./response";
import {
  createDaemonInstallActionContext,
  failIfNixDaemonInstallMode,
  parsePort,
} from "./shared";
import type { DaemonInstallOptions } from "./types";

export async function runDaemonInstall(opts: DaemonInstallOptions) {
  const { json, stdout, warnings, emit, fail } = createDaemonInstallActionContext(opts.json);
  if (failIfNixDaemonInstallMode(fail)) {
    return;
  }

  const cfg = await readBestEffortConfig();
  const portOverride = parsePort(opts.port);
  if (opts.port !== undefined && portOverride === null) {
    fail("Invalid port");
    return;
  }
  const port = portOverride ?? resolveGatewayPort(cfg);
  if (!Number.isFinite(port) || port <= 0) {
    fail("Invalid port");
    return;
  }
  const runtimeRaw = opts.runtime ? String(opts.runtime) : DEFAULT_GATEWAY_DAEMON_RUNTIME;
  if (!isGatewayDaemonRuntime(runtimeRaw)) {
    fail('Invalid --runtime (use "node" or "bun")');
    return;
  }

  const service = resolveGatewayService();
  let loaded = false;
  try {
    loaded = await service.isLoaded({ env: process.env });
  } catch (err) {
    if (isNonFatalSystemdInstallProbeError(err)) {
      loaded = false;
    } else {
      fail(`Gateway service check failed: ${String(err)}`);
      return;
    }
  }
  if (loaded) {
    if (!opts.force) {
      emit({
        ok: true,
        result: "already-installed",
        message: `Gateway service already ${service.loadedText}.`,
        service: buildDaemonServiceSnapshot(service, loaded),
      });
      if (!json) {
        defaultRuntime.log(`Gateway service already ${service.loadedText}.`);
        defaultRuntime.log(
          `Reinstall with: ${formatCliCommand("powerdirector gateway install --force")}`,
        );
      }
      return;
    }
  }

  const tokenResolution = await resolveGatewayInstallToken({
    config: cfg,
    env: process.env,
    explicitToken: opts.token,
    autoGenerateWhenMissing: true,
    persistGeneratedToken: true,
  });
  if (tokenResolution.unavailableReason) {
    fail(`Gateway install blocked: ${tokenResolution.unavailableReason}`);
    return;
  }
  for (const warning of tokenResolution.warnings) {
    if (json) {
      warnings.push(warning);
    } else {
      defaultRuntime.log(warning);
    }
  }

  const { programArguments, workingDirectory, environment } = await buildGatewayInstallPlan({
    env: process.env,
    port,
    runtime: runtimeRaw,
    warn: (message) => {
      if (json) {
        warnings.push(message);
      } else {
        defaultRuntime.log(message);
      }
    },
    config: cfg,
  });

  await installDaemonServiceAndEmit({
    serviceNoun: "Gateway",
    service,
    warnings,
    emit,
    fail,
    install: async () => {
      await service.install({
        env: process.env,
        stdout,
        programArguments,
        workingDirectory,
        environment,
      });
    },
  });
}
