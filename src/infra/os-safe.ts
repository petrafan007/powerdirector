import * as os from "node:os";

export const safeHomedir = (): string => {
  try {
    return typeof os.homedir === "function" ? os.homedir() : "";
  } catch {
    return "";
  }
};

export const safeTmpdir = (): string => {
  try {
    return typeof os.tmpdir === "function" ? os.tmpdir() : "/tmp";
  } catch {
    return "/tmp";
  }
};

const osSafe = {
  ...os,
  homedir: safeHomedir,
  tmpdir: safeTmpdir,
};

export default osSafe;
