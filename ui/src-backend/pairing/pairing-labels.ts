import { getPairingAdapter } from "../channels/plugins/pairing";
import type { PairingChannel } from "./pairing-store";

export function resolvePairingIdLabel(channel: PairingChannel): string {
  return getPairingAdapter(channel)?.idLabel ?? "userId";
}
