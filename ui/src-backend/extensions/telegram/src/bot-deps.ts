import { loadConfig, resolveStorePath } from "@/src-backend/plugin-sdk/config-runtime";
import { readChannelAllowFromStore } from "@/src-backend/plugin-sdk/conversation-runtime";
import { enqueueSystemEvent } from "@/src-backend/plugin-sdk/infra-runtime";
import {
  dispatchReplyWithBufferedBlockDispatcher,
  listSkillCommandsForAgents,
} from "@/src-backend/plugin-sdk/reply-runtime";
import { wasSentByBot } from "./sent-message-cache";

export type TelegramBotDeps = {
  loadConfig: typeof loadConfig;
  resolveStorePath: typeof resolveStorePath;
  readChannelAllowFromStore: typeof readChannelAllowFromStore;
  enqueueSystemEvent: typeof enqueueSystemEvent;
  dispatchReplyWithBufferedBlockDispatcher: typeof dispatchReplyWithBufferedBlockDispatcher;
  listSkillCommandsForAgents: typeof listSkillCommandsForAgents;
  wasSentByBot: typeof wasSentByBot;
};

export const defaultTelegramBotDeps: TelegramBotDeps = {
  get loadConfig() {
    return loadConfig;
  },
  get resolveStorePath() {
    return resolveStorePath;
  },
  get readChannelAllowFromStore() {
    return readChannelAllowFromStore;
  },
  get enqueueSystemEvent() {
    return enqueueSystemEvent;
  },
  get dispatchReplyWithBufferedBlockDispatcher() {
    return dispatchReplyWithBufferedBlockDispatcher;
  },
  get listSkillCommandsForAgents() {
    return listSkillCommandsForAgents;
  },
  get wasSentByBot() {
    return wasSentByBot;
  },
};
