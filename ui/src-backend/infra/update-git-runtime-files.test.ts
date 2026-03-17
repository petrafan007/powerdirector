import { describe, expect, it } from "vitest";
import {
  filterBlockingGitDirtyStatus,
  isIgnorableGitDirtyStatusLine,
  isSafeGitConfigArtifactRootPath,
  isSafeGitTempRootDirPath,
} from './update-git-runtime-files';

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
    expect(isIgnorableGitDirtyStatusLine("?? powerdirector.config.json.tmp")).toBe(true);
    expect(isIgnorableGitDirtyStatusLine("?? powerdirector.config.json.bak.2")).toBe(true);
    expect(isIgnorableGitDirtyStatusLine(" M README.md")).toBe(false);
    expect(isIgnorableGitDirtyStatusLine("?? notes/")).toBe(false);
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
          "?? powerdirector.config.json.tmp",
          "?? powerdirector.config.json.bak.1",
          "?? notes/",
          " M README.md",
        ].join("\n"),
      ),
    ).toEqual(["?? notes/", " M README.md"]);
  });
});
