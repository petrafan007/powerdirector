import {
  isNumericTelegramUserId,
  normalizeTelegramAllowFromEntry,
} from "@/src-backend/plugin-sdk/telegram";
import { readChannelAllowFromStore } from "../pairing/pairing-store";
import {
  isDiscordMutableAllowEntry,
  isZalouserMutableGroupEntry,
} from "./mutable-allowlist-detectors";

export const auditChannelRuntime = {
  readChannelAllowFromStore,
  isDiscordMutableAllowEntry,
  isZalouserMutableGroupEntry,
  isNumericTelegramUserId,
  normalizeTelegramAllowFromEntry,
};
