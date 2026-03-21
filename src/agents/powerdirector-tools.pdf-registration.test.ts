import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { PowerDirectorConfig } from "../config/config.js";
import "./test-helpers/fast-core-tools.js";
import { createPowerDirectorTools } from "./powerdirector-tools.js";

async function withTempAgentDir<T>(run: (agentDir: string) => Promise<T>): Promise<T> {
  const agentDir = await fs.mkdtemp(path.join(((typeof ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp")) === "function") ? ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp"))() : "/tmp"), "powerdirector-tools-pdf-"));
  try {
    return await run(agentDir);
  } finally {
    await fs.rm(agentDir, { recursive: true, force: true });
  }
}

describe("createPowerDirectorTools PDF registration", () => {
  it("includes pdf tool when pdfModel is configured", async () => {
    await withTempAgentDir(async (agentDir) => {
      const cfg: PowerDirectorConfig = {
        agents: {
          defaults: {
            pdfModel: { primary: "openai/gpt-5-mini" },
          },
        },
      };

      const tools = createPowerDirectorTools({ config: cfg, agentDir });
      expect(tools.some((tool) => tool.name === "pdf")).toBe(true);
    });
  });
});
