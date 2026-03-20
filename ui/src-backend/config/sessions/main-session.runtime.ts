import { loadConfig } from "../io";
import { resolveMainSessionKey } from "./main-session";

export function resolveMainSessionKeyFromConfig(): string {
  return resolveMainSessionKey(loadConfig());
}
