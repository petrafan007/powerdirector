export type {
  MatrixActionClientOpts,
  MatrixMessageSummary,
  MatrixReactionSummary,
} from "./actions/types";
export {
  sendMatrixMessage,
  editMatrixMessage,
  deleteMatrixMessage,
  readMatrixMessages,
} from "./actions/messages";
export { listMatrixReactions, removeMatrixReactions } from "./actions/reactions";
export { pinMatrixMessage, unpinMatrixMessage, listMatrixPins } from "./actions/pins";
export { getMatrixMemberInfo, getMatrixRoomInfo } from "./actions/room";
export { reactMatrixMessage } from "./send";
