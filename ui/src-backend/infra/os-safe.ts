import * as os from "node:os";

/**
 * Hoisted function declarations to resolve ReferenceError during early module evaluation
 * especially in Next.js worker threads where imports might be partially resolved.
 */
export function safeHomedir(): string {
  const native = os.homedir;
  try {
    return typeof native === "function" ? native() : "";
  } catch {
    return "";
  }
}

export function safeTmpdir(): string {
  const native = os.tmpdir;
  try {
    return typeof native === "function" ? native() : "/tmp";
  } catch {
    return "/tmp";
  }
}

const osSafe = {
  ...os,
  homedir: safeHomedir,
  tmpdir: safeTmpdir,
};

export default osSafe;
