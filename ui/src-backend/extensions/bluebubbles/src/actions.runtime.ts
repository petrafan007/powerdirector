import { sendBlueBubblesAttachment as sendBlueBubblesAttachmentImpl } from "./attachments";
import {
  addBlueBubblesParticipant as addBlueBubblesParticipantImpl,
  editBlueBubblesMessage as editBlueBubblesMessageImpl,
  leaveBlueBubblesChat as leaveBlueBubblesChatImpl,
  removeBlueBubblesParticipant as removeBlueBubblesParticipantImpl,
  renameBlueBubblesChat as renameBlueBubblesChatImpl,
  setGroupIconBlueBubbles as setGroupIconBlueBubblesImpl,
  unsendBlueBubblesMessage as unsendBlueBubblesMessageImpl,
} from "./chat";
import { resolveBlueBubblesMessageId as resolveBlueBubblesMessageIdImpl } from "./monitor";
import { sendBlueBubblesReaction as sendBlueBubblesReactionImpl } from "./reactions";
import {
  resolveChatGuidForTarget as resolveChatGuidForTargetImpl,
  sendMessageBlueBubbles as sendMessageBlueBubblesImpl,
} from "./send";

export const blueBubblesActionsRuntime = {
  sendBlueBubblesAttachment: sendBlueBubblesAttachmentImpl,
  addBlueBubblesParticipant: addBlueBubblesParticipantImpl,
  editBlueBubblesMessage: editBlueBubblesMessageImpl,
  leaveBlueBubblesChat: leaveBlueBubblesChatImpl,
  removeBlueBubblesParticipant: removeBlueBubblesParticipantImpl,
  renameBlueBubblesChat: renameBlueBubblesChatImpl,
  setGroupIconBlueBubbles: setGroupIconBlueBubblesImpl,
  unsendBlueBubblesMessage: unsendBlueBubblesMessageImpl,
  resolveBlueBubblesMessageId: resolveBlueBubblesMessageIdImpl,
  sendBlueBubblesReaction: sendBlueBubblesReactionImpl,
  resolveChatGuidForTarget: resolveChatGuidForTargetImpl,
  sendMessageBlueBubbles: sendMessageBlueBubblesImpl,
};
