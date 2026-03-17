import { listSystemPresence } from '../../infra/system-presence';
import type { GatewayBroadcastFn } from '../server-broadcast';

export function broadcastPresenceSnapshot(params: {
  broadcast: GatewayBroadcastFn;
  incrementPresenceVersion: () => number;
  getHealthVersion: () => number;
}): number {
  const presenceVersion = params.incrementPresenceVersion();
  params.broadcast(
    "presence",
    { presence: listSystemPresence() },
    {
      dropIfSlow: true,
      stateVersion: {
        presence: presenceVersion,
        health: params.getHealthVersion(),
      },
    },
  );
  return presenceVersion;
}
