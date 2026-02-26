import fs from 'node:fs';
import path from 'node:path';
import { resolvePowerDirectorRoot } from './paths';

type AgentConfigEntry = {
    id?: string;
    agentDir?: string;
    workspace?: string;
};

function resolveConfiguredDir(rootDir: string, candidate?: string): string | null {
    if (typeof candidate !== 'string') return null;
    const trimmed = candidate.trim();
    if (!trimmed) return null;
    return path.isAbsolute(trimmed)
        ? path.resolve(trimmed)
        : path.resolve(rootDir, trimmed);
}

function loadAgentEntry(rootDir: string, agentId: string): AgentConfigEntry | null {
    const configPath = path.join(rootDir, 'powerdirector.config.json');
    if (!fs.existsSync(configPath)) return null;
    try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const list = Array.isArray(config?.agents?.list) ? config.agents.list : [];
        const match = list.find((entry: AgentConfigEntry) => entry?.id === agentId);
        return match || null;
    } catch {
        return null;
    }
}

export function resolveAgentWorkspace(agentIdRaw?: string | null): {
    rootDir: string;
    agentId: string;
    workspaceDir: string;
    isDefault: boolean;
} {
    const rootDir = resolvePowerDirectorRoot();
    const normalized = (agentIdRaw || '').trim();
    const isDefault = !normalized || normalized === 'main' || normalized === 'default';
    const agentId = isDefault ? 'main' : normalized;

    if (isDefault) {
        return {
            rootDir,
            agentId,
            workspaceDir: path.resolve(rootDir, 'agent'),
            isDefault: true
        };
    }

    const entry = loadAgentEntry(rootDir, agentId);
    const configured = resolveConfiguredDir(rootDir, entry?.agentDir) || resolveConfiguredDir(rootDir, entry?.workspace);
    const fallback = path.resolve(rootDir, 'agents', agentId);

    return {
        rootDir,
        agentId,
        workspaceDir: configured || fallback,
        isDefault: false
    };
}
