import { vi } from "vitest";
import { installChromeUserDataDirHooks } from "./chrome-user-data-dir.test-harness";

const chromeUserDataDir = { dir: "/tmp/powerdirector" };
installChromeUserDataDirHooks(chromeUserDataDir);

vi.mock("./chrome", () => ({
  isChromeCdpReady: vi.fn(async () => true),
  isChromeReachable: vi.fn(async () => true),
  launchPowerDirectorChrome: vi.fn(async () => {
    throw new Error("unexpected launch");
  }),
  resolvePowerDirectorUserDataDir: vi.fn(() => chromeUserDataDir.dir),
  stopPowerDirectorChrome: vi.fn(async () => {}),
}));
