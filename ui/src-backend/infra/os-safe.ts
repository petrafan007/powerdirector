import * as os from "node:os";

/**
 * Robust homedir resolution to avoid ReferenceError during early module evaluation
 * especially in Next.js worker threads.
 */
export function safeHomedir(): string {
  try {
    return os.homedir();
  } catch {
    return process.env.HOME || process.env.USERPROFILE || "";
  }
}

export function safeTmpdir(): string {
  try {
    return os.tmpdir();
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
