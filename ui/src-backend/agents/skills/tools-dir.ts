import path from "node:path";
import { safePathSegmentHashed } from '../../infra/install-safe-path';
import { resolveConfigDir } from '../../utils';
import { resolveSkillKey } from './frontmatter';
import type { SkillEntry } from './types';

export function resolveSkillToolsRootDir(entry: SkillEntry): string {
  const key = resolveSkillKey(entry.skill, entry);
  const safeKey = safePathSegmentHashed(key);
  return path.join(resolveConfigDir(), "tools", safeKey);
}
