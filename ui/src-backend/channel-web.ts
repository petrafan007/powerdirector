// Barrel exports for the web channel pieces. Splitting the original 900+ line
// module keeps responsibilities small and testable.
import { resolveWaWebAuthDir } from "./plugins/runtime/runtime-whatsapp-boundary";

export { HEARTBEAT_PROMPT } from "./auto-reply/heartbeat";
export { HEARTBEAT_TOKEN } from "./auto-reply/tokens";
export { loadWebMedia, optimizeImageToJpeg } from "./media/web-media";
export {
  createWaSocket,
  extractMediaPlaceholder,
  extractText,
  formatError,
  getStatusCode,
  logWebSelfId,
  loginWeb,
  logoutWeb,
  monitorWebChannel,
  monitorWebInbox,
  pickWebChannel,
  resolveHeartbeatRecipients,
  runWebHeartbeatOnce,
  sendMessageWhatsApp,
  sendReactionWhatsApp,
  waitForWaConnection,
  webAuthExists,
} from "./plugins/runtime/runtime-whatsapp-boundary";

// Keep the historic constant surface available, but resolve it through the
// plugin boundary only when a caller actually coerces the value to string.
class LazyWhatsAppAuthDir {
  #value: string | null = null;

  #read(): string {
    this.#value ??= resolveWaWebAuthDir();
    return this.#value;
  }

  toString(): string {
    return this.#read();
  }

  valueOf(): string {
    return this.#read();
  }

  [Symbol.toPrimitive](): string {
    return this.#read();
  }
}

export const WA_WEB_AUTH_DIR = new LazyWhatsAppAuthDir() as unknown as string;
