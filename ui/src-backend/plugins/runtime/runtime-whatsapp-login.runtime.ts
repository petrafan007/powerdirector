import { loginWeb as loginWebImpl } from "./runtime-whatsapp-boundary";
import type { PluginRuntime } from "./types";

type RuntimeWhatsAppLogin = Pick<PluginRuntime["channel"]["whatsapp"], "loginWeb">;

export const runtimeWhatsAppLogin = {
  loginWeb: loginWebImpl,
} satisfies RuntimeWhatsAppLogin;
