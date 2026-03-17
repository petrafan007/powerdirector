import type { Command } from "commander";
import { docsSearchCommand } from '../commands/docs';
import { defaultRuntime } from '../runtime';
import { formatDocsLink } from '../terminal/links';
import { theme } from '../terminal/theme';
import { runCommandWithRuntime } from './cli-utils';

export function registerDocsCli(program: Command) {
  program
    .command("docs")
    .description("Search the live PowerDirector docs")
    .argument("[query...]", "Search query")
    .addHelpText(
      "after",
      () =>
        `\n${theme.muted("Docs:")} ${formatDocsLink("/cli/docs", "docs.powerdirector.ai/cli/docs")}\n`,
    )
    .action(async (queryParts: string[]) => {
      await runCommandWithRuntime(defaultRuntime, async () => {
        await docsSearchCommand(queryParts, defaultRuntime);
      });
    });
}
