export interface WizardRunMeta {
    lastRunAt: string;
    lastRunVersion: string;
    lastRunCommand: string;
    lastRunMode: 'local' | 'remote' | 'cloud';
}

export function parseForceRunFlag(raw: string | null | undefined): boolean {
    const normalized = (raw || '').trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export function parseWizardMeta(raw: any): WizardRunMeta | null {
    if (!raw || typeof raw !== 'object') return null;
    const lastRunAt = typeof raw.lastRunAt === 'string' ? raw.lastRunAt : '';
    if (!lastRunAt) return null;

    return {
        lastRunAt,
        lastRunVersion: typeof raw.lastRunVersion === 'string' ? raw.lastRunVersion : '',
        lastRunCommand: typeof raw.lastRunCommand === 'string' ? raw.lastRunCommand : '',
        lastRunMode: raw.lastRunMode === 'remote' || raw.lastRunMode === 'cloud' ? raw.lastRunMode : 'local',
    };
}

export function isCurrentWizardVersion(meta: WizardRunMeta | null, appVersion: string): boolean {
    if (!meta) return false;
    if (!meta.lastRunVersion) return true;
    return meta.lastRunVersion === appVersion;
}

export function shouldAutoSkipWizard(meta: WizardRunMeta | null, appVersion: string, forceRun: boolean): boolean {
    if (!meta || forceRun) return false;
    return isCurrentWizardVersion(meta, appVersion);
}
