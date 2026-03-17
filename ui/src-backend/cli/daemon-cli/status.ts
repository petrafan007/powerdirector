import { defaultRuntime } from '../../runtime';
import { colorize, isRich, theme } from '../../terminal/theme';
import { gatherDaemonStatus } from './status.gather';
import { printDaemonStatus } from './status.print';
import type { DaemonStatusOptions } from './types';

export async function runDaemonStatus(opts: DaemonStatusOptions) {
  try {
    const status = await gatherDaemonStatus({
      rpc: opts.rpc,
      probe: Boolean(opts.probe),
      deep: Boolean(opts.deep),
    });
    printDaemonStatus(status, { json: Boolean(opts.json) });
  } catch (err) {
    const rich = isRich();
    defaultRuntime.error(colorize(rich, theme.error, `Gateway status failed: ${String(err)}`));
    defaultRuntime.exit(1);
  }
}
