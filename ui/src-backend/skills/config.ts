// @ts-nocheck
import { PowerDirectorConfig } from '../config/config-schema.ts';
import { SkillEntry, SkillEligibilityContext } from './types';

export function shouldIncludeSkill(params: {
    entry: SkillEntry;
    config?: PowerDirectorConfig;
    eligibility?: SkillEligibilityContext;
}): boolean {
    if (params.entry.enabled === false) {
        return false;
    }

    // Check global config
    const globalEnabled = params.config?.skills?.entries?.[params.entry.skill.name]?.enabled;
    if (globalEnabled === false) {
        return false;
    }

    return true;
}
