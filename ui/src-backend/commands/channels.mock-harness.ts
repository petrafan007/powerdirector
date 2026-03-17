import { vi } from "vitest";
import type { MockFn } from '../test-utils/vitest-mock-fn';

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

vi.mock("../config/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/config')>();
  return {
    ...actual,
    readConfigFileSnapshot: configMocks.readConfigFileSnapshot,
    writeConfigFile: configMocks.writeConfigFile,
  };
});

vi.mock("../telegram/update-offset-store.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import('../telegram/update-offset-store')>();
  return {
    ...actual,
    deleteTelegramUpdateOffset: offsetMocks.deleteTelegramUpdateOffset,
  };
});
