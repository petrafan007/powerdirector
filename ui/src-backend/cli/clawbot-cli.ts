import type { Command } from "commander";
import { registerQrCli } from './qr-cli';

export function registerClawbotCli(program: Command) {
  const clawbot = program.command("clawbot").description("Legacy clawbot command aliases");
  registerQrCli(clawbot);
}
