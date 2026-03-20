// Narrow plugin-sdk surface for the bundled device-pair plugin.
// Keep this list additive and scoped to symbols used under extensions/device-pair.

export { definePluginEntry } from "./core";
export { approveDevicePairing, listDevicePairing } from "../infra/device-pairing";
export { issueDeviceBootstrapToken } from "../infra/device-bootstrap";
export type { PowerDirectorPluginApi } from "../plugins/types";
export { resolveGatewayBindUrl } from "../shared/gateway-bind-url";
export { resolveTailnetHostWithRunner } from "../shared/tailscale-status";
export { runPluginCommandWithTimeout } from "./run-command";
