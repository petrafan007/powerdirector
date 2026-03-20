import {
  listMatrixDirectoryGroupsLive as listMatrixDirectoryGroupsLiveImpl,
  listMatrixDirectoryPeersLive as listMatrixDirectoryPeersLiveImpl,
} from "./directory-live";
import { resolveMatrixAuth as resolveMatrixAuthImpl } from "./matrix/client";
import { probeMatrix as probeMatrixImpl } from "./matrix/probe";
import { sendMessageMatrix as sendMessageMatrixImpl } from "./matrix/send";
import { matrixOutbound as matrixOutboundImpl } from "./outbound";
import { resolveMatrixTargets as resolveMatrixTargetsImpl } from "./resolve-targets";
export const matrixChannelRuntime = {
  listMatrixDirectoryGroupsLive: listMatrixDirectoryGroupsLiveImpl,
  listMatrixDirectoryPeersLive: listMatrixDirectoryPeersLiveImpl,
  resolveMatrixAuth: resolveMatrixAuthImpl,
  probeMatrix: probeMatrixImpl,
  sendMessageMatrix: sendMessageMatrixImpl,
  resolveMatrixTargets: resolveMatrixTargetsImpl,
  matrixOutbound: { ...matrixOutboundImpl },
};
