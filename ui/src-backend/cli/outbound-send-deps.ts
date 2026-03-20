import type { OutboundSendDeps } from "../infra/outbound/deliver";
import {
  createOutboundSendDepsFromCliSource,
  type CliOutboundSendSource,
} from "./outbound-send-mapping";

export type CliDeps = CliOutboundSendSource;

export function createOutboundSendDeps(deps: CliDeps): OutboundSendDeps {
  return createOutboundSendDepsFromCliSource(deps);
}
