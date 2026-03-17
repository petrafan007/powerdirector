import type { PowerDirectorConfig } from '../config/config';
import { applyAgentDefaultPrimaryModel } from './model-default';

export const GOOGLE_GEMINI_DEFAULT_MODEL = "google/gemini-3-pro-preview";

export function applyGoogleGeminiModelDefault(cfg: PowerDirectorConfig): {
  next: PowerDirectorConfig;
  changed: boolean;
} {
  return applyAgentDefaultPrimaryModel({ cfg, model: GOOGLE_GEMINI_DEFAULT_MODEL });
}
