#!/usr/bin/env node
import "./bootstrap.js";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { getReplyFromConfig } from './auto-reply/reply';
import { applyTemplate } from './auto-reply/templating';
import { monitorWebChannel } from './channel-web';
import { createDefaultDeps } from './cli/deps';
import { promptYesNo } from './cli/prompt';
import { waitForever } from './cli/wait';
import { loadConfig } from './config/config';
import {
  deriveSessionKey,
  loadSessionStore,
  resolveSessionKey,
  resolveStorePath,
  saveSessionStore,
} from './config/sessions';
import { ensureBinary } from './infra/binaries';
import { loadDotEnv } from './infra/dotenv';
import { normalizeEnv } from './infra/env';
import { formatUncaughtError } from './infra/errors';
import { isMainModule } from './infra/is-main';
import { ensurePowerDirectorCliOnPath } from './infra/path-env';
import {
  describePortOwner,
  ensurePortAvailable,
  handlePortError,
  PortInUseError,
} from './infra/ports';
import { assertSupportedRuntime } from './infra/runtime-guard';
import { installUnhandledRejectionHandler } from './infra/unhandled-rejections';
import { enableConsoleCapture } from './logging';
import { runCommandWithTimeout, runExec } from './process/exec';
import { assertWebChannel, normalizeE164, toWhatsappJid } from './utils';

normalizeEnv();
ensurePowerDirectorCliOnPath();

// Capture all console output into structured logs while keeping stdout/stderr behavior.
enableConsoleCapture();

// Enforce the minimum supported runtime before doing any work.
assertSupportedRuntime();

import { buildProgram } from './cli/program';

const program = buildProgram();

export {
  assertWebChannel,
  applyTemplate,
  createDefaultDeps,
  deriveSessionKey,
  describePortOwner,
  ensureBinary,
  ensurePortAvailable,
  getReplyFromConfig,
  handlePortError,
  loadConfig,
  loadSessionStore,
  monitorWebChannel,
  normalizeE164,
  PortInUseError,
  promptYesNo,
  resolveSessionKey,
  resolveStorePath,
  runCommandWithTimeout,
  runExec,
  saveSessionStore,
  toWhatsappJid,
  waitForever,
};

const isMain = isMainModule({
  currentFile: fileURLToPath(import.meta.url),
});

if (isMain) {
  // Global error handlers to prevent silent crashes from unhandled rejections/exceptions.
  // These log the error and exit gracefully instead of crashing without trace.
  installUnhandledRejectionHandler();

  process.on("uncaughtException", (error) => {
    console.error("[powerdirector] Uncaught exception:", formatUncaughtError(error));
    process.exit(1);
  });

  void program.parseAsync(process.argv).catch((err) => {
    console.error("[powerdirector] CLI failed:", formatUncaughtError(err));
    process.exit(1);
  });
}
