import type { Command } from "commander";
import { formatDocsLink } from '../../terminal/links';
import { theme } from '../../terminal/theme';
import { addGatewayServiceCommands } from './register-service-commands';

export function registerDaemonCli(program: Command) {
  const daemon = program
    .command("daemon")
    .description("Manage the Gateway service (launchd/systemd/schtasks)")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/gateway", "docs.powerdirector.ai/cli/gateway")}\n`,
    );

  addGatewayServiceCommands(daemon, {
    statusDescription: "Show service install status + probe the Gateway",
  });
}
