import { afterEach, describe, expect, it } from "vitest";
import { MediaManager } from './media';

const originalStateDir = process.env.POWERDIRECTOR_STATE_DIR;

afterEach(() => {
  if (originalStateDir === undefined) {
    delete process.env.POWERDIRECTOR_STATE_DIR;
    return;
  }
  process.env.POWERDIRECTOR_STATE_DIR = originalStateDir;
});

describe("MediaManager runtime storage", () => {
  it("defaults media storage outside the install repo", () => {
    process.env.POWERDIRECTOR_STATE_DIR = "/tmp/powerdirector-state-media";
    const manager = new MediaManager({}, "/repo/powerdirector");

    expect(manager.getStatus().storageDir).toBe("/tmp/powerdirector-state-media/media");
  });

  it("keeps explicit relative storage under the provided base dir", () => {
    process.env.POWERDIRECTOR_STATE_DIR = "/tmp/powerdirector-state-media";
    const manager = new MediaManager({ storageDir: "custom-media" }, "/tmp/powerdirector-media-base");

    expect(manager.getStatus().storageDir).toBe("/tmp/powerdirector-media-base/custom-media");
  });
});
