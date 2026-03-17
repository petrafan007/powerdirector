import { vi } from "vitest";
import { stubTool } from './fast-tool-stubs';

vi.mock("../tools/browser-tool.js", () => ({
  createBrowserTool: () => stubTool("browser"),
}));

vi.mock("../tools/canvas-tool.js", () => ({
  createCanvasTool: () => stubTool("canvas"),
}));
