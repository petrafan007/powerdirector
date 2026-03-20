import { sendBlueBubblesMedia as sendBlueBubblesMediaImpl } from "./media-send";
import {
  monitorBlueBubblesProvider as monitorBlueBubblesProviderImpl,
  resolveBlueBubblesMessageId as resolveBlueBubblesMessageIdImpl,
  resolveWebhookPathFromConfig as resolveWebhookPathFromConfigImpl,
} from "./monitor";
import { probeBlueBubbles as probeBlueBubblesImpl } from "./probe";
import { sendMessageBlueBubbles as sendMessageBlueBubblesImpl } from "./send";

export type { BlueBubblesProbe } from "./probe";

export const blueBubblesChannelRuntime = {
  sendBlueBubblesMedia: sendBlueBubblesMediaImpl,
  resolveBlueBubblesMessageId: resolveBlueBubblesMessageIdImpl,
  monitorBlueBubblesProvider: monitorBlueBubblesProviderImpl,
  resolveWebhookPathFromConfig: resolveWebhookPathFromConfigImpl,
  probeBlueBubbles: probeBlueBubblesImpl,
  sendMessageBlueBubbles: sendMessageBlueBubblesImpl,
};
