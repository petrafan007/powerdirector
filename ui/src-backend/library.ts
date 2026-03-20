import { getReplyFromConfig } from "./auto-reply/reply";
import { applyTemplate } from "./auto-reply/templating";
import { createDefaultDeps } from "./cli/deps";
import { promptYesNo } from "./cli/prompt";
import { waitForever } from "./cli/wait";
import { loadConfig } from "./config/config";
import {
  deriveSessionKey,
  loadSessionStore,
  resolveSessionKey,
  resolveStorePath,
  saveSessionStore,
} from "./config/sessions";
import { ensureBinary } from "./infra/binaries";
import {
  describePortOwner,
  ensurePortAvailable,
  handlePortError,
  PortInUseError,
} from "./infra/ports";
import { monitorWebChannel } from "./plugins/runtime/runtime-whatsapp-boundary";
import { runCommandWithTimeout, runExec } from "./process/exec";
import { assertWebChannel, normalizeE164, toWhatsappJid } from "./utils";

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
