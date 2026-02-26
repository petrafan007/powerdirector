import { describe, expect, it } from "vitest";
import type { PowerDirectorConfig } from '../config/config';
import { resolveImageSanitizationLimits } from './image-sanitization';

describe("image sanitization config", () => {
  it("defaults when no config value exists", () => {
    expect(resolveImageSanitizationLimits(undefined)).toEqual({});
    expect(
      resolveImageSanitizationLimits({ agents: { defaults: {} } } as unknown as PowerDirectorConfig),
    ).toEqual({});
  });

  it("reads and normalizes agents.defaults.imageMaxDimensionPx", () => {
    expect(
      resolveImageSanitizationLimits({
        agents: { defaults: { imageMaxDimensionPx: 1600.9 } },
      } as unknown as PowerDirectorConfig),
    ).toEqual({ maxDimensionPx: 1600 });
  });
});
