import { describe, expect, it } from "vitest";
import {
  filterBlockingGitDirtyStatus,
  isIgnorableGitDirtyStatusLine,
  isSafeGitConfigArtifactRootPath,
  isSafeGitRuntimeNestedDirPath,
  isSafeGitRuntimeRootDirPath,
  isSafeGitRuntimeRootFilePath,
  isSafeGitTempRootDirPath,
} from "./update-git-runtime-files.js";

describe("update git runtime file helpers", () => {
  it("recognizes safe root temp directories", () => {
    expect(isSafeGitTempRootDirPath("tmp/")).toBe(true);
    expect(isSafeGitTempRootDirPath(".tmp-frigate-edit/")).toBe(true);
    expect(isSafeGitTempRootDirPath("nested/tmp/")).toBe(false);
    expect(isSafeGitTempRootDirPath("tmp-file")).toBe(false);
  });

  it("ignores untracked safe temp directories in git status output", () => {
    expect(isIgnorableGitDirtyStatusLine("?? tmp/")).toBe(true);
    expect(isIgnorableGitDirtyStatusLine("?? .tmp-frigate-edit/")).toBe(true);
    expect(isIgnorableGitDirtyStatusLine("?? .powerdirector/")).toBe(true);
    expect(isIgnorableGitDirtyStatusLine("?? logs/")).toBe(true);
    expect(isIgnorableGitDirtyStatusLine("?? ui/.wwebjs_auth/")).toBe(true);
    expect(isIgnorableGitDirtyStatusLine("?? powerdirector.config.json.tmp")).toBe(true);
    expect(isIgnorableGitDirtyStatusLine("?? powerdirector.config.json.bak.2")).toBe(true);
    expect(isIgnorableGitDirtyStatusLine("?? .env.local")).toBe(true);
    expect(isIgnorableGitDirtyStatusLine("?? powerdirector.db-wal")).toBe(true);
    expect(isIgnorableGitDirtyStatusLine(" M README.md")).toBe(false);
    expect(isIgnorableGitDirtyStatusLine("?? notes/")).toBe(false);
  });

  it("recognizes runtime state directories and files", () => {
    expect(isSafeGitRuntimeRootDirPath(".powerdirector/")).toBe(true);
    expect(isSafeGitRuntimeRootDirPath(".powerdirector-update-backups/")).toBe(true);
    expect(isSafeGitRuntimeRootDirPath("logs/")).toBe(true);
    expect(isSafeGitRuntimeRootDirPath("nested/.powerdirector/")).toBe(false);
    expect(isSafeGitRuntimeNestedDirPath("ui/.wwebjs_auth/")).toBe(true);
    expect(isSafeGitRuntimeNestedDirPath("agent/media/")).toBe(true);
    expect(isSafeGitRuntimeNestedDirPath("nested/agent/media/")).toBe(false);
    expect(isSafeGitRuntimeRootFilePath(".env")).toBe(true);
    expect(isSafeGitRuntimeRootFilePath(".env.production.local")).toBe(true);
    expect(isSafeGitRuntimeRootFilePath("powerdirector.db")).toBe(true);
    expect(isSafeGitRuntimeRootFilePath("powerdirector.db-shm")).toBe(true);
    expect(isSafeGitRuntimeRootFilePath("notes.txt")).toBe(false);
  });

  it("recognizes safe root config temp and backup artifacts", () => {
    expect(isSafeGitConfigArtifactRootPath("powerdirector.config.json.tmp")).toBe(true);
    expect(isSafeGitConfigArtifactRootPath("powerdirector.config.json.123.uuid.tmp")).toBe(true);
    expect(isSafeGitConfigArtifactRootPath("powerdirector.config.json.bak")).toBe(true);
    expect(isSafeGitConfigArtifactRootPath("powerdirector.config.json.bak.3")).toBe(true);
    expect(isSafeGitConfigArtifactRootPath("nested/powerdirector.config.json.tmp")).toBe(false);
    expect(isSafeGitConfigArtifactRootPath("README.md")).toBe(false);
  });

  it("keeps blocking git status lines after filtering", () => {
    expect(
      filterBlockingGitDirtyStatus(
        [
          "?? tmp/",
          "?? .tmp-frigate-edit/",
          "?? .powerdirector/",
          "?? ui/.wwebjs_auth/",
          "?? .env.local",
          "?? powerdirector.config.json.tmp",
          "?? powerdirector.config.json.bak.1",
          "?? notes/",
          " M README.md",
        ].join("\n"),
      ),
    ).toEqual(["?? notes/", " M README.md"]);
  });
});
