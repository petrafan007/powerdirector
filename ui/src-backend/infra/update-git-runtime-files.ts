import fs from "node:fs/promises";
import path from "node:path";

export const GIT_RUNTIME_PRESERVE_PATHS = ["powerdirector.config.json"] as const;

export type PreservedGitRuntimeFile = {
  relativePath: string;
  absolutePath: string;
  content: Buffer;
};

export function buildGitDirtyCheckArgv(root: string): string[] {
  return [
    "git",
    "-C",
    root,
    "status",
    "--porcelain",
    "--",
    ":!dist/control-ui/",
    ...GIT_RUNTIME_PRESERVE_PATHS.map((relativePath) => `:!${relativePath}`),
  ];
}

export async function snapshotPreservedGitRuntimeFiles(
  root: string,
): Promise<PreservedGitRuntimeFile[]> {
  const preserved: PreservedGitRuntimeFile[] = [];

  for (const relativePath of GIT_RUNTIME_PRESERVE_PATHS) {
    const absolutePath = path.join(root, relativePath);
    try {
      const content = await fs.readFile(absolutePath);
      preserved.push({ relativePath, absolutePath, content });
    } catch {
      // Ignore missing files.
    }
  }

  return preserved;
}

export async function restorePreservedGitRuntimeFiles(
  preserved: PreservedGitRuntimeFile[],
): Promise<void> {
  for (const file of preserved) {
    await fs.mkdir(path.dirname(file.absolutePath), { recursive: true });
    await fs.writeFile(file.absolutePath, file.content);
  }
}
