import {
  getChatInfo as getChatInfoImpl,
  getChatMembers as getChatMembersImpl,
  getFeishuMemberInfo as getFeishuMemberInfoImpl,
} from "./chat";
import {
  listFeishuDirectoryGroupsLive as listFeishuDirectoryGroupsLiveImpl,
  listFeishuDirectoryPeersLive as listFeishuDirectoryPeersLiveImpl,
} from "./directory";
import { feishuOutbound as feishuOutboundImpl } from "./outbound";
import {
  createPinFeishu as createPinFeishuImpl,
  listPinsFeishu as listPinsFeishuImpl,
  removePinFeishu as removePinFeishuImpl,
} from "./pins";
import { probeFeishu as probeFeishuImpl } from "./probe";
import {
  addReactionFeishu as addReactionFeishuImpl,
  listReactionsFeishu as listReactionsFeishuImpl,
  removeReactionFeishu as removeReactionFeishuImpl,
} from "./reactions";
import {
  editMessageFeishu as editMessageFeishuImpl,
  getMessageFeishu as getMessageFeishuImpl,
  sendCardFeishu as sendCardFeishuImpl,
  sendMessageFeishu as sendMessageFeishuImpl,
} from "./send";

export const feishuChannelRuntime = {
  listFeishuDirectoryGroupsLive: listFeishuDirectoryGroupsLiveImpl,
  listFeishuDirectoryPeersLive: listFeishuDirectoryPeersLiveImpl,
  feishuOutbound: { ...feishuOutboundImpl },
  createPinFeishu: createPinFeishuImpl,
  listPinsFeishu: listPinsFeishuImpl,
  removePinFeishu: removePinFeishuImpl,
  probeFeishu: probeFeishuImpl,
  addReactionFeishu: addReactionFeishuImpl,
  listReactionsFeishu: listReactionsFeishuImpl,
  removeReactionFeishu: removeReactionFeishuImpl,
  getChatInfo: getChatInfoImpl,
  getChatMembers: getChatMembersImpl,
  getFeishuMemberInfo: getFeishuMemberInfoImpl,
  editMessageFeishu: editMessageFeishuImpl,
  getMessageFeishu: getMessageFeishuImpl,
  sendCardFeishu: sendCardFeishuImpl,
  sendMessageFeishu: sendMessageFeishuImpl,
};
