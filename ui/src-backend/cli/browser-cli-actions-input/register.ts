import type { Command } from "commander";
import type { BrowserParentOpts } from "../browser-cli-shared";
import { registerBrowserElementCommands } from "./register.element";
import { registerBrowserFilesAndDownloadsCommands } from "./register.files-downloads";
import { registerBrowserFormWaitEvalCommands } from "./register.form-wait-eval";
import { registerBrowserNavigationCommands } from "./register.navigation";

export function registerBrowserActionInputCommands(
  browser: Command,
  parentOpts: (cmd: Command) => BrowserParentOpts,
) {
  registerBrowserNavigationCommands(browser, parentOpts);
  registerBrowserElementCommands(browser, parentOpts);
  registerBrowserFilesAndDownloadsCommands(browser, parentOpts);
  registerBrowserFormWaitEvalCommands(browser, parentOpts);
}
