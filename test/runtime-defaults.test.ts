import { describe, expect, it } from "vitest";
import type { PowerDirectorConfig } from "../ui/src-backend/config/config";
import { resolveDefaultAgentWorkspaceDir } from "../ui/src-backend/agents/workspace";
import { resolveServiceWorkspaceDir } from "../ui/lib/runtime-defaults";

describe("resolveServiceWorkspaceDir", () => {
  it("falls back to the default PowerDirector workspace when config leaves it blank", () => {
    expect(resolveServiceWorkspaceDir({} as PowerDirectorConfig)).toBe(
      resolveDefaultAgentWorkspaceDir(process.env),
    );
  });

  it("honors configured default-agent workspace values", () => {
    const cfg = {
      agents: {
        defaults: {
          workspace: "~/custom-powerdirector-workspace",
        },
      },
    } as PowerDirectorConfig;

    expect(resolveServiceWorkspaceDir(cfg)).toMatch(/custom-powerdirector-workspace$/);
  });
});
