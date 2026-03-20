import { z } from "zod";
import {
  hasConfiguredSecretInput,
  normalizeResolvedSecretInputString,
  normalizeSecretInputString,
} from "../config/types.secrets";
import { buildSecretInputSchema } from "./secret-input-schema";

export type { SecretInput } from "../config/types.secrets";
export {
  buildSecretInputSchema,
  hasConfiguredSecretInput,
  normalizeResolvedSecretInputString,
  normalizeSecretInputString,
};

export function buildOptionalSecretInputSchema() {
  return buildSecretInputSchema().optional();
}

export function buildSecretInputArraySchema() {
  return z.array(buildSecretInputSchema());
}
