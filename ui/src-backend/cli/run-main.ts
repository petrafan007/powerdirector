import process from "node:process";
import { fileURLToPath } from "node:url";
import { loadDotEnv } from '../infra/dotenv';
import { normalizeEnv } from '../infra/env';
import { formatUncaughtError } from '../infra/errors';
import { isMainModule } from '../infra/is-main';
import { ensurePowerDirectorCliOnPath } from '../infra/path-env';
import { assertSupportedRuntime } from '../infra/runtime-guard';
import { installUnhandledRejectionHandler } from '../infra/unhandled-rejections';
import { enableConsoleCapture } from '../logging';
import { getCommandPath, getPrimaryCommand, hasHelpOrVersion } from './argv';
import { tryRouteCli } from './route';
import { normalizeWindowsArgv } from './windows-argv';

export function rewriteUpdateFlagArgv(argv: string[]): string[] {
  const index = argv.indexOf("--update");
  if (index === -1) {
    return argv;
  }

  const next = [...argv];
  next.splice(index, 1, "update");
  return next;
}

export function shouldRegisterPrimarySubcommand(argv: string[]): boolean {
  return !hasHelpOrVersion(argv);
}

export function shouldSkipPluginCommandRegistration(params: {
  argv: string[];
  primary: string | null;
  hasBuiltinPrimary: boolean;
}): boolean {
  if (params.hasBuiltinPrimary) {
    return true;
  }
  if (!params.primary) {
    return hasHelpOrVersion(params.argv);
  }
  return false;
}

export function shouldEnsureCliPath(argv: string[]): boolean {
  if (hasHelpOrVersion(argv)) {
    return false;
  }
  const [primary, secondary] = getCommandPath(argv, 2);
  if (!primary) {
    return true;
  }
  if (primary === "status" || primary === "health" || primary === "sessions") {
    return false;
  }
  if (primary === "config" && (secondary === "get" || secondary === "unset")) {
    return false;
  }
  if (primary === "models" && (secondary === "list" || secondary === "status")) {
    return false;
  }
  return true;
}

export async function runCli(argv: string[] = process.argv) {
  const normalizedArgv = normalizeWindowsArgv(argv);
  loadDotEnv({ quiet: true });
  normalizeEnv();
  if (shouldEnsureCliPath(normalizedArgv)) {
    ensurePowerDirectorCliOnPath();
  }

  // Enforce the minimum supported runtime before doing any work.
  assertSupportedRuntime();

  if (await tryRouteCli(normalizedArgv)) {
    return;
  }

  // Capture all console output into structured logs while keeping stdout/stderr behavior.
  enableConsoleCapture();

  const { buildProgram } = await import('./program');
  const program = buildProgram();

  // Global error handlers to prevent silent crashes from unhandled rejections/exceptions.
  // These log the error and exit gracefully instead of crashing without trace.
  installUnhandledRejectionHandler();

  process.on("uncaughtException", (error) => {
    console.error("[powerdirector] Uncaught exception:", formatUncaughtError(error));
    process.exit(1);
  });

  const parseArgv = rewriteUpdateFlagArgv(normalizedArgv);
  // Register the primary command (builtin or subcli) so help and command parsing
  // are correct even with lazy command registration.
  const primary = getPrimaryCommand(parseArgv);
  if (primary) {
    const { getProgramContext } = await import('./program/program-context');
    const ctx = getProgramContext(program);
    if (ctx) {
      const { registerCoreCliByName } = await import('./program/command-registry');
      await registerCoreCliByName(program, ctx, primary, parseArgv);
    }
    const { registerSubCliByName } = await import('./program/register.subclis');
    await registerSubCliByName(program, primary);
  }

  const hasBuiltinPrimary =
    primary !== null && program.commands.some((command) => command.name() === primary);
  const shouldSkipPluginRegistration = shouldSkipPluginCommandRegistration({
    argv: parseArgv,
    primary,
    hasBuiltinPrimary,
  });
  if (!shouldSkipPluginRegistration) {
    // Register plugin CLI commands before parsing
    const { registerPluginCliCommands } = await import('../plugins/cli');
    const { loadConfig } = await import('../config/config');
    registerPluginCliCommands(program, loadConfig());
  }

  await program.parseAsync(parseArgv);
}

export function isCliMainModule(): boolean {
  return isMainModule({ currentFile: fileURLToPath(import.meta.url) });
}
