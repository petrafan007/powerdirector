import { vi } from "vitest";

type TestMock = ReturnType<typeof vi.fn>;

export const loadConfigMock: TestMock = vi.fn();
export const resolveGatewayPortMock: TestMock = vi.fn();
export const pickPrimaryTailnetIPv4Mock: TestMock = vi.fn();
export const pickPrimaryLanIPv4Mock: TestMock = vi.fn();

vi.mock("../config/config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/config")>();
  return {
    ...actual,
    loadConfig: loadConfigMock,
    resolveGatewayPort: resolveGatewayPortMock,
  };
});

vi.mock("../infra/tailnet", () => ({
  pickPrimaryTailnetIPv4: pickPrimaryTailnetIPv4Mock,
}));

vi.mock("./net", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./net")>();
  return {
    ...actual,
    pickPrimaryLanIPv4: pickPrimaryLanIPv4Mock,
  };
});
