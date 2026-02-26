import { formatCliCommand } from '../cli/command-format';
import type { PairingChannel } from './pairing-store';

export function buildPairingReply(params: {
  channel: PairingChannel;
  idLine: string;
  code: string;
}): string {
  const { channel, idLine, code } = params;
  return [
    "PowerDirector: access not configured.",
    "",
    idLine,
    "",
    `Pairing code: ${code}`,
    "",
    "Ask the bot owner to approve with:",
    formatCliCommand(`powerdirector pairing approve ${channel} ${code}`),
  ].join("\n");
}
