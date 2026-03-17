import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { withTempHome } from '../../test/helpers/temp-home';

const { noteSpy } = vi.hoisted(() => ({
  noteSpy: vi.fn(),
}));

vi.mock("../terminal/note.js", () => ({
  note: noteSpy,
}));

import { loadAndMaybeMigrateDoctorConfig } from './doctor-config-flow';

describe("doctor include warning", () => {
  it("surfaces include confinement hint for escaped include paths", async () => {
    await withTempHome(async (home) => {
      const configDir = path.join(home, ".powerdirector");
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        path.join(configDir, "powerdirector.config.json"),
        JSON.stringify({ $include: "/etc/passwd" }, null, 2),
        "utf-8",
      );

      await loadAndMaybeMigrateDoctorConfig({
        options: { nonInteractive: true },
        confirm: async () => false,
      });
    });

    expect(noteSpy).toHaveBeenCalledWith(
      expect.stringContaining("$include paths must stay under:"),
      "Doctor warnings",
    );
  });
});
