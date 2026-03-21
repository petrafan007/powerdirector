import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const GIT_RUNTIME_PRESERVE_PATHS = ["powerdirector.config.json", "MEMORY.md"] as const;
export const GIT_RUNTIME_BACKUP_PATHS = [
  ...GIT_RUNTIME_PRESERVE_PATHS,
  ".env",
  "powerdirector.db",
  "powerdirector.db-shm",
  "powerdirector.db-wal",
  "state",
  "diagnostics",
  "media",
  "memory",
  "ui/.wwebjs_auth",
] as const;
export const GIT_SAFE_TEMP_ROOT_DIR_NAMES = ["tmp"] as const;
export const GIT_SAFE_TEMP_ROOT_DIR_PREFIXES = [".tmp-"] as const;
const GIT_SAFE_CONFIG_ARTIFACT_ROOT_FILE_RE =
  /^powerdirector(?:\.config)?\.json(?:\.bak(?:\.\d+)?|(?:\.[^.]+){0,2}\.tmp)$/i;

export type PreservedGitRuntimeFile = {
  relativePath: string;
  absolutePath: string;
  content: Buffer;
};

export type GitRuntimeBackup = {
  backupDir: string;
  createdAt: string;
  copiedPaths: string[];
  missingPaths: string[];
};

type RuntimeBackupCandidate = {
  relativePath: string;
  absolutePath: string;
  isDirectory: boolean;
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
    ":!ui/src-backend/",
    ":!pnpm-lock.yaml",
    ":!package-lock.json",
    ...GIT_RUNTIME_PRESERVE_PATHS.map((relativePath) => `:!${relativePath}`),
  ];
}

function normalizeGitStatusPath(rawPath: string): string {
  const trimmed = rawPath.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function isSafeGitTempRootDirPath(rawPath: string): boolean {
  const normalizedPath = normalizeGitStatusPath(rawPath);
  if (!normalizedPath.endsWith("/")) {
    return false;
  }
  const rootDir = normalizedPath.slice(0, -1);
  if (rootDir.includes("/")) {
    return false;
  }
  if (GIT_SAFE_TEMP_ROOT_DIR_NAMES.includes(rootDir as (typeof GIT_SAFE_TEMP_ROOT_DIR_NAMES)[number])) {
    return true;
  }
  return GIT_SAFE_TEMP_ROOT_DIR_PREFIXES.some((prefix) => rootDir.startsWith(prefix));
}

export function isSafeGitConfigArtifactRootPath(rawPath: string): boolean {
  const normalizedPath = normalizeGitStatusPath(rawPath);
  return !normalizedPath.includes("/") && GIT_SAFE_CONFIG_ARTIFACT_ROOT_FILE_RE.test(normalizedPath);
}

export function isIgnorableGitDirtyStatusLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return true;
  }
  if (!trimmed.startsWith("?? ")) {
    return false;
  }
  const dirtyPath = trimmed.slice(3);
  return isSafeGitTempRootDirPath(dirtyPath) || isSafeGitConfigArtifactRootPath(dirtyPath);
}

export function filterBlockingGitDirtyStatus(stdout: string): string[] {
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .filter((line) => !isIgnorableGitDirtyStatusLine(line));
}

function formatBackupTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function resolveRuntimeBackupBaseDir(root: string): string {
  const homeDir = ((typeof (typeof os.homedir === "function" ? os.homedir : (() => "")) === "function") ? (typeof os.homedir === "function" ? os.homedir : (() => ""))() : "").trim();
  const instanceName = path.basename(root) || "powerdirector";
  if (homeDir.length > 0) {
    return path.join(homeDir, "powerdirector-backups", instanceName);
  }
  return path.join(root, ".powerdirector-update-backups");
}

async function statRuntimeBackupCandidate(
  root: string,
  relativePath: string,
): Promise<RuntimeBackupCandidate | null> {
  const absolutePath = path.join(root, relativePath);
  try {
    const stats = await fs.lstat(absolutePath);
    return {
      relativePath,
      absolutePath,
      isDirectory: stats.isDirectory(),
    };
  } catch {
    return null;
  }
}

async function copyRuntimeBackupCandidate(
  candidate: RuntimeBackupCandidate,
  backupDir: string,
): Promise<void> {
  const destinationPath = path.join(backupDir, candidate.relativePath);
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  if (candidate.isDirectory) {
    await fs.cp(candidate.absolutePath, destinationPath, { recursive: true, force: true });
    return;
  }
  await fs.copyFile(candidate.absolutePath, destinationPath);
}

export async function createGitRuntimeBackup(root: string): Promise<GitRuntimeBackup> {
  const createdDate = new Date();
  const createdAt = createdDate.toISOString();
  const backupDir = path.join(
    resolveRuntimeBackupBaseDir(root),
    `update-${formatBackupTimestamp(createdDate)}`,
  );
  const candidates = (
    await Promise.all(
      GIT_RUNTIME_BACKUP_PATHS.map((relativePath) => statRuntimeBackupCandidate(root, relativePath)),
    )
  ).filter((candidate): candidate is RuntimeBackupCandidate => candidate !== null);

  await fs.mkdir(backupDir, { recursive: true });

  for (const candidate of candidates) {
    await copyRuntimeBackupCandidate(candidate, backupDir);
  }

  const copiedPaths = candidates.map((candidate) => candidate.relativePath);
  const missingPaths = GIT_RUNTIME_BACKUP_PATHS.filter((relativePath) => !copiedPaths.includes(relativePath));

  await fs.writeFile(
    path.join(backupDir, "manifest.json"),
    JSON.stringify(
      {
        root,
        createdAt,
        copiedPaths,
        missingPaths,
      },
      null,
      2,
    ) + "\n",
    "utf-8",
  );

  return {
    backupDir,
    createdAt,
    copiedPaths,
    missingPaths,
  };
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
