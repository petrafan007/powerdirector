import type { Command } from "commander";
import { formatDocsLink } from "../../terminal/links";
import { theme } from "../../terminal/theme";
import { formatHelpExamples } from "../help-format";
import { registerNodesCameraCommands } from "./register.camera";
import { registerNodesCanvasCommands } from "./register.canvas";
import { registerNodesInvokeCommands } from "./register.invoke";
import { registerNodesLocationCommands } from "./register.location";
import { registerNodesNotifyCommand } from "./register.notify";
import { registerNodesPairingCommands } from "./register.pairing";
import { registerNodesPushCommand } from "./register.push";
import { registerNodesScreenCommands } from "./register.screen";
import { registerNodesStatusCommands } from "./register.status";

export function registerNodesCli(program: Command) {
  const nodes = program
    .command("nodes")
    .description("Manage gateway-owned nodes (pairing, status, invoke, and media)")
    .addHelpText(
      "after",
      () =>
        `\n${theme.heading("Examples:")}\n${formatHelpExamples([
          ["powerdirector nodes status", "List known nodes with live status."],
          ["powerdirector nodes pairing pending", "Show pending node pairing requests."],
          ['powerdirector nodes run --node <id> --raw "uname -a"', "Run a shell command on a node."],
          ["powerdirector nodes camera snap --node <id>", "Capture a photo from a node camera."],
        ])}\n\n${theme.muted("Docs:")} ${formatDocsLink("/cli/nodes", "docs.powerdirector.ai/cli/nodes")}\n`,
    );

  registerNodesStatusCommands(nodes);
  registerNodesPairingCommands(nodes);
  registerNodesInvokeCommands(nodes);
  registerNodesNotifyCommand(nodes);
  registerNodesPushCommand(nodes);
  registerNodesCanvasCommands(nodes);
  registerNodesCameraCommands(nodes);
  registerNodesScreenCommands(nodes);
  registerNodesLocationCommands(nodes);
}
