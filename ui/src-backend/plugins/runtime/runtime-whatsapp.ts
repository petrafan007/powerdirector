import {
  createRuntimeWhatsAppLoginTool,
  getActiveWebListener,
  getWebAuthAgeMs,
  handleWhatsAppAction,
  logWebSelfId,
  loginWeb,
  logoutWeb,
  monitorWebChannel,
  readWebSelfId,
  sendMessageWhatsApp,
  sendPollWhatsApp,
  startWebLoginWithQr,
  waitForWebLogin,
  webAuthExists,
} from "./runtime-whatsapp-boundary";
import type { PluginRuntime } from "./types";

export function createRuntimeWhatsApp(): PluginRuntime["channel"]["whatsapp"] {
  return {
    getActiveWebListener,
    getWebAuthAgeMs,
    logoutWeb,
    logWebSelfId,
    readWebSelfId,
    webAuthExists,
    sendMessageWhatsApp,
    sendPollWhatsApp,
    loginWeb,
    startWebLoginWithQr,
    waitForWebLogin,
    monitorWebChannel,
    handleWhatsAppAction,
    createLoginTool: createRuntimeWhatsAppLoginTool,
  };
}
