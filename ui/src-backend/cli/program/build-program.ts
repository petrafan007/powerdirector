import { Command } from "commander";
import { registerProgramCommands } from "./command-registry";
import { createProgramContext } from "./context";
import { configureProgramHelp } from "./help";
import { registerPreActionHooks } from "./preaction";
import { setProgramContext } from "./program-context";

export function buildProgram() {
  const program = new Command();
  const ctx = createProgramContext();
  const argv = process.argv;

  setProgramContext(program, ctx);
  configureProgramHelp(program, ctx);
  registerPreActionHooks(program, ctx.programVersion);

  registerProgramCommands(program, ctx, argv);

  return program;
}
