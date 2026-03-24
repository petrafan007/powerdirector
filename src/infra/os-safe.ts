import * as home from "./home-dir";
export { safeHomedir, safeTmpdir } from "./home-dir";

const osSafe = {
  ...home,
  homedir: home.safeHomedir,
  tmpdir: home.safeTmpdir,
};

export default osSafe;
