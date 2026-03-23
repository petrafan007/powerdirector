import * as os from "node:os";
import { homedir as nativeHomedir, tmpdir as nativeTmpdir } from "node:os";

export function safeHomedir(): string {
  try {
    return typeof nativeHomedir === "function" ? nativeHomedir() : "";
  } catch {
    return "";
  }
}

export function safeTmpdir(): string {
  try {
    return typeof nativeTmpdir === "function" ? nativeTmpdir() : "/tmp";
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
