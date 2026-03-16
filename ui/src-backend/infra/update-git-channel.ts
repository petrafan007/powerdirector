import { type CommandOptions } from "../process/exec.js";
import { compareSemverStrings } from "./update-check.js";
import { isBetaTag, isStableTag, type UpdateChannel } from "./update-channels.js";

type CommandRunner = (
  argv: string[],
  options: CommandOptions,
) => Promise<{ stdout: string; stderr: string; code: number | null }>;

export async function listGitTags(
  runCommand: CommandRunner,
  root: string,
  timeoutMs: number,
  pattern = "v*",
): Promise<string[]> {
  const res = await runCommand(["git", "-C", root, "tag", "--list", pattern, "--sort=-v:refname"], {
    timeoutMs,
  }).catch(() => null);
  if (!res || res.code !== 0) {
    return [];
  }
  return res.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function normalizeVersionTag(tag: string | null): string | null {
  if (!tag) {
    return null;
  }
  const trimmed = tag.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.startsWith("v") ? trimmed.slice(1) : trimmed;
}

export async function resolveGitChannelTag(
  runCommand: CommandRunner,
  root: string,
  timeoutMs: number,
  channel: Exclude<UpdateChannel, "dev">,
): Promise<string | null> {
  const tags = await listGitTags(runCommand, root, timeoutMs);
  if (channel === "beta") {
    const betaTag = tags.find((tag) => isBetaTag(tag)) ?? null;
    const stableTag = tags.find((tag) => isStableTag(tag)) ?? null;
    if (!betaTag) {
      return stableTag;
    }
    if (!stableTag) {
      return betaTag;
    }
    const cmp = compareSemverStrings(betaTag, stableTag);
    if (cmp != null && cmp < 0) {
      return stableTag;
    }
    return betaTag;
  }
  return tags.find((tag) => isStableTag(tag)) ?? null;
}

export async function resolveGitChannelVersion(
  runCommand: CommandRunner,
  root: string,
  timeoutMs: number,
  channel: Exclude<UpdateChannel, "dev">,
): Promise<{ tag: string | null; version: string | null }> {
  const release = await resolveGitChannelRelease(runCommand, root, timeoutMs, channel);
  return {
    tag: release.tag,
    version: release.version,
  };
}

async function resolveGitTagCommit(
  runCommand: CommandRunner,
  root: string,
  timeoutMs: number,
  tag: string,
): Promise<string | null> {
  const res = await runCommand(["git", "-C", root, "rev-list", "-n", "1", tag], {
    timeoutMs,
  }).catch(() => null);
  if (!res || res.code !== 0) {
    return null;
  }
  const sha = res.stdout.trim();
  return sha || null;
}

export async function resolveGitChannelRelease(
  runCommand: CommandRunner,
  root: string,
  timeoutMs: number,
  channel: Exclude<UpdateChannel, "dev">,
): Promise<{ tag: string | null; version: string | null; sha: string | null }> {
  const tag = await resolveGitChannelTag(runCommand, root, timeoutMs, channel);
  const sha = tag ? await resolveGitTagCommit(runCommand, root, timeoutMs, tag) : null;
  return {
    tag,
    version: normalizeVersionTag(tag),
    sha,
  };
}
