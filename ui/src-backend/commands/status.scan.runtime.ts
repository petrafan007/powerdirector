import { collectChannelStatusIssues } from "../infra/channels-status-issues";
import { buildChannelsTable } from "./status-all/channels";

export const statusScanRuntime = {
  collectChannelStatusIssues,
  buildChannelsTable,
};
