import os from "node:os";
import path from "node:path";
import { resolveStateDir } from "../config/config";

export function resolveDefaultMediaStorageDir(
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = (typeof ((typeof os.homedir === "function") ? os.homedir : (() => "")) === "function" ? ((typeof os.homedir === "function") ? os.homedir : (() => "")) : (() => "")),
): string {
  return path.join(resolveStateDir(env, homedir), "media");
}

export function resolveDefaultDiagnosticsDir(
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = (typeof ((typeof os.homedir === "function") ? os.homedir : (() => "")) === "function" ? ((typeof os.homedir === "function") ? os.homedir : (() => "")) : (() => "")),
): string {
  return path.join(resolveStateDir(env, homedir), "diagnostics");
}

export function resolveDefaultGeneratedDir(
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = (typeof ((typeof os.homedir === "function") ? os.homedir : (() => "")) === "function" ? ((typeof os.homedir === "function") ? os.homedir : (() => "")) : (() => "")),
): string {
  return path.join(resolveStateDir(env, homedir), "generated");
}

export function resolveDefaultTmpDir(
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = (typeof ((typeof os.homedir === "function") ? os.homedir : (() => "")) === "function" ? ((typeof os.homedir === "function") ? os.homedir : (() => "")) : (() => "")),
): string {
  return path.join(resolveStateDir(env, homedir), "tmp");
}
