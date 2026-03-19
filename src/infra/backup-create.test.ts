import { describe, expect, it } from "vitest";
import { formatBackupCreateSummary, type BackupCreateResult } from "./backup-create.js";

function makeResult(overrides: Partial<BackupCreateResult> = {}): BackupCreateResult {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    archiveRoot: "powerdirector-backup-2026-01-01",
    archivePath: "/tmp/powerdirector-backup.tar.gz",
    dryRun: false,
    includeWorkspace: true,
    onlyConfig: false,
    verified: false,
    assets: [],
    skipped: [],
    ...overrides,
  };
}

describe("formatBackupCreateSummary", () => {
  it("formats created archives with included and skipped paths", () => {
    const lines = formatBackupCreateSummary(
      makeResult({
        verified: true,
        assets: [
          {
            kind: "state",
            sourcePath: "/state",
            archivePath: "archive/state",
            displayPath: "~/.powerdirector",
          },
        ],
        skipped: [
          {
            kind: "workspace",
            sourcePath: "/workspace",
            displayPath: "~/Projects/powerdirector",
            reason: "covered",
            coveredBy: "~/.powerdirector",
          },
        ],
      }),
    );

    expect(lines).toEqual([
      "Backup archive: /tmp/powerdirector-backup.tar.gz",
      "Included 1 path:",
      "- state: ~/.powerdirector",
      "Skipped 1 path:",
      "- workspace: ~/Projects/powerdirector (covered by ~/.powerdirector)",
      "Created /tmp/powerdirector-backup.tar.gz",
      "Archive verification: passed",
    ]);
  });

  it("formats dry runs and pluralized counts", () => {
    const lines = formatBackupCreateSummary(
      makeResult({
        dryRun: true,
        assets: [
          {
            kind: "config",
            sourcePath: "/config",
            archivePath: "archive/config",
            displayPath: "~/.powerdirector/config.json",
          },
          {
            kind: "credentials",
            sourcePath: "/oauth",
            archivePath: "archive/oauth",
            displayPath: "~/.powerdirector/oauth",
          },
        ],
      }),
    );

    expect(lines).toEqual([
      "Backup archive: /tmp/powerdirector-backup.tar.gz",
      "Included 2 paths:",
      "- config: ~/.powerdirector/config.json",
      "- credentials: ~/.powerdirector/oauth",
      "Dry run only; archive was not written.",
    ]);
  });
});
