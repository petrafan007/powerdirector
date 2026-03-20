import type { Command } from "commander";
import { danger } from "../globals";
import { defaultRuntime } from "../runtime";
import { formatDocsLink } from "../terminal/links";
import { theme } from "../terminal/theme";
import { registerBrowserActionInputCommands } from "./browser-cli-actions-input";
import { registerBrowserActionObserveCommands } from "./browser-cli-actions-observe";
import { registerBrowserDebugCommands } from "./browser-cli-debug";
import { browserActionExamples, browserCoreExamples } from "./browser-cli-examples";
import { registerBrowserInspectCommands } from "./browser-cli-inspect";
import { registerBrowserManageCommands } from "./browser-cli-manage";
import type { BrowserParentOpts } from "./browser-cli-shared";
import { registerBrowserStateCommands } from "./browser-cli-state";
import { formatCliCommand } from "./command-format";
import { addGatewayClientOptions } from "./gateway-rpc";
import { formatHelpExamples } from "./help-format";

export function registerBrowserCli(program: Command) {
  const browser = program
    .command("browser")
    .description("Manage PowerDirector's dedicated browser (Chrome/Chromium)")
    .option("--browser-profile <name>", "Browser profile name (default from config)")
    .option("--json", "Output machine-readable JSON", false)
    .addHelpText(
      "after",
      () =>
        `\n${theme.heading("Examples:")}\n${formatHelpExamples(
          [...browserCoreExamples, ...browserActionExamples].map((cmd) => [cmd, ""]),
          true,
        )}\n\n${theme.muted("Docs:")} ${formatDocsLink(
          "/cli/browser",
          "docs.powerdirector.ai/cli/browser",
        )}\n`,
    )
    .action(() => {
      browser.outputHelp();
      defaultRuntime.error(
        danger(`Missing subcommand. Try: "${formatCliCommand("powerdirector browser status")}"`),
      );
      defaultRuntime.exit(1);
    });

  addGatewayClientOptions(browser);

  const parentOpts = (cmd: Command) => cmd.parent?.opts?.() as BrowserParentOpts;

  registerBrowserManageCommands(browser, parentOpts);
  registerBrowserInspectCommands(browser, parentOpts);
  registerBrowserActionInputCommands(browser, parentOpts);
  registerBrowserActionObserveCommands(browser, parentOpts);
  registerBrowserDebugCommands(browser, parentOpts);
  registerBrowserStateCommands(browser, parentOpts);
}
