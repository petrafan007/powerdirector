import { Command } from "commander";
import { VERSION } from "../../version";
import { getCoreCliCommandDescriptors } from "./core-command-descriptors";
import { configureProgramHelp } from "./help";
import { getSubCliEntries } from "./subcli-descriptors";

function buildRootHelpProgram(): Command {
  const program = new Command();
  configureProgramHelp(program, {
    programVersion: VERSION,
    channelOptions: [],
    messageChannelOptions: "",
    agentChannelOptions: "",
  });

  for (const command of getCoreCliCommandDescriptors()) {
    program.command(command.name).description(command.description);
  }
  for (const command of getSubCliEntries()) {
    program.command(command.name).description(command.description);
  }

  return program;
}

export function outputRootHelp(): void {
  const program = buildRootHelpProgram();
  program.outputHelp();
}
