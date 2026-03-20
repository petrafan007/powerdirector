import { defineChannelPluginEntry } from "@/src-backend/plugin-sdk/core";
import { registerFeishuBitableTools } from "./src/bitable";
import { feishuPlugin } from "./src/channel";
import { registerFeishuChatTools } from "./src/chat";
import { registerFeishuDocTools } from "./src/docx";
import { registerFeishuDriveTools } from "./src/drive";
import { registerFeishuPermTools } from "./src/perm";
import { setFeishuRuntime } from "./src/runtime";
import { registerFeishuSubagentHooks } from "./src/subagent-hooks";
import { registerFeishuWikiTools } from "./src/wiki";

export { feishuPlugin } from "./src/channel";
export { setFeishuRuntime } from "./src/runtime";
export { monitorFeishuProvider } from "./src/monitor";
export {
  sendMessageFeishu,
  sendCardFeishu,
  updateCardFeishu,
  editMessageFeishu,
  getMessageFeishu,
} from "./src/send";
export {
  uploadImageFeishu,
  uploadFileFeishu,
  sendImageFeishu,
  sendFileFeishu,
  sendMediaFeishu,
} from "./src/media";
export { probeFeishu } from "./src/probe";
export {
  addReactionFeishu,
  removeReactionFeishu,
  listReactionsFeishu,
  FeishuEmoji,
} from "./src/reactions";
export {
  extractMentionTargets,
  extractMessageBody,
  isMentionForwardRequest,
  formatMentionForText,
  formatMentionForCard,
  formatMentionAllForText,
  formatMentionAllForCard,
  buildMentionedMessage,
  buildMentionedCardContent,
  type MentionTarget,
} from "./src/mention";

export default defineChannelPluginEntry({
  id: "feishu",
  name: "Feishu",
  description: "Feishu/Lark channel plugin",
  plugin: feishuPlugin,
  setRuntime: setFeishuRuntime,
  registerFull(api) {
    registerFeishuSubagentHooks(api);
    registerFeishuDocTools(api);
    registerFeishuChatTools(api);
    registerFeishuWikiTools(api);
    registerFeishuDriveTools(api);
    registerFeishuPermTools(api);
    registerFeishuBitableTools(api);
  },
});
