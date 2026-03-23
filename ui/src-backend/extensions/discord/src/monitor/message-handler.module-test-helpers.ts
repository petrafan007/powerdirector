import type { MockFn } from "powerdirector/plugin-sdk/testing";
import { vi } from "vitest";

export const preflightDiscordMessageMock: MockFn = vi.fn();
export const processDiscordMessageMock: MockFn = vi.fn();

vi.mock("./message-handler.preflight", () => ({
  preflightDiscordMessage: preflightDiscordMessageMock,
}));

vi.mock("./message-handler.process", () => ({
  processDiscordMessage: processDiscordMessageMock,
}));

export const { createDiscordMessageHandler } = await import("./message-handler");
