import { vi } from "vitest";
import { stubTool } from "./fast-tool-stubs";

vi.mock("../tools/browser-tool", () => ({
  createBrowserTool: () => stubTool("browser"),
}));

vi.mock("../tools/canvas-tool", () => ({
  createCanvasTool: () => stubTool("canvas"),
}));
