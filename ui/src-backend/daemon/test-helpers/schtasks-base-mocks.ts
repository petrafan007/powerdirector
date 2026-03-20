import { vi } from "vitest";
import {
  inspectPortUsage,
  killProcessTree,
  schtasksCalls,
  schtasksResponses,
} from "./schtasks-fixtures";

vi.mock("../schtasks-exec", () => ({
  execSchtasks: async (argv: string[]) => {
    schtasksCalls.push(argv);
    return schtasksResponses.shift() ?? { code: 0, stdout: "", stderr: "" };
  },
}));

vi.mock("../../infra/ports", () => ({
  inspectPortUsage: (port: number) => inspectPortUsage(port),
}));

vi.mock("../../process/kill-tree", () => ({
  killProcessTree: (pid: number, opts?: { graceMs?: number }) => killProcessTree(pid, opts),
}));
