import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateConfigObject } from "./config.js";

describe("workspace location validation", () => {
  it("rejects a default workspace inside the current checkout", () => {
    const res = validateConfigObject({
      agents: {
        defaults: {
          workspace: path.join(process.cwd(), "workspace"),
        },
      },
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.issues[0]?.path).toBe("agents.defaults.workspace");
    }
  });

  it("rejects an agent workspace inside the current checkout", () => {
    const res = validateConfigObject({
      agents: {
        list: [
          {
            id: "main",
            workspace: path.join(process.cwd(), "agents", "main"),
          },
        ],
      },
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.issues[0]?.path).toBe("agents.list.0.workspace");
    }
  });

  it("accepts a workspace outside the current checkout", () => {
    const res = validateConfigObject({
      agents: {
        defaults: {
          workspace: path.join(process.cwd(), "..", "powerdirector-workspace"),
        },
      },
    });

    expect(res.ok).toBe(true);
  });
});
