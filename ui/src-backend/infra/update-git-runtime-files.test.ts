import { describe, expect, it } from "vitest";
import {
  filterBlockingGitDirtyStatus,
  isIgnorableGitDirtyStatusLine,
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
    expect(isIgnorableGitDirtyStatusLine(" M README.md")).toBe(false);
    expect(isIgnorableGitDirtyStatusLine("?? notes/")).toBe(false);
  });

  it("keeps blocking git status lines after filtering", () => {
    expect(
      filterBlockingGitDirtyStatus(
        ["?? tmp/", "?? .tmp-frigate-edit/", "?? notes/", " M README.md"].join("\n"),
      ),
    ).toEqual(["?? notes/", " M README.md"]);
  });
});
