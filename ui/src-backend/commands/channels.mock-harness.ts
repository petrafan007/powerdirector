import { vi } from "vitest";
import type { MockFn } from "../test-utils/vitest-mock-fn";

export const configMocks: {
  readConfigFileSnapshot: MockFn;
  writeConfigFile: MockFn;
} = {
  readConfigFileSnapshot: vi.fn() as unknown as MockFn,
  writeConfigFile: vi.fn().mockResolvedValue(undefined) as unknown as MockFn,
};

export const offsetMocks: {
  deleteTelegramUpdateOffset: MockFn;
} = {
  deleteTelegramUpdateOffset: vi.fn().mockResolvedValue(undefined) as unknown as MockFn,
};

vi.mock("../config/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/config")>();
  return {
    ...actual,
    readConfigFileSnapshot: configMocks.readConfigFileSnapshot,
    writeConfigFile: configMocks.writeConfigFile,
  };
});

vi.mock("powerdirector/extensions/telegram/src/update-offset-store", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("powerdirector/extensions/telegram/src/update-offset-store")>();
  return {
    ...actual,
    deleteTelegramUpdateOffset: offsetMocks.deleteTelegramUpdateOffset,
  };
});
