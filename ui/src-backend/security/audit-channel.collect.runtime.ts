import { collectChannelSecurityFindings as collectChannelSecurityFindingsImpl } from "./audit-channel";

type CollectChannelSecurityFindings =
  typeof import("./audit-channel").collectChannelSecurityFindings;

export function collectChannelSecurityFindings(
  ...args: Parameters<CollectChannelSecurityFindings>
): ReturnType<CollectChannelSecurityFindings> {
  return collectChannelSecurityFindingsImpl(...args);
}
