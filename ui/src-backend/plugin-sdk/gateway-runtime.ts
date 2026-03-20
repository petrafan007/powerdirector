// Public gateway/client helpers for plugins that talk to the host gateway surface.

export * from "../gateway/channel-status-patches";
export { GatewayClient } from "../gateway/client";
export { createOperatorApprovalsGatewayClient } from "../gateway/operator-approvals-client";
export type { EventFrame } from "../gateway/protocol/index";
