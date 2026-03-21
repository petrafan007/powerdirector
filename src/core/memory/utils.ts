// @ts-nocheck
import os from 'node:os';
import path from 'node:path';

export function resolveUserPath(raw: string): string {
    if (raw.startsWith('~/')) {
        return path.join(((typeof ((typeof os.homedir === "function") ? os.homedir : (() => "")) === "function") ? ((typeof ((typeof os.homedir === "function") ? os.homedir : (() => "")) === "function") ? ((typeof os.homedir === "function") ? os.homedir : (() => ""))() : "") : ""), raw.slice(2));
    }
    return path.resolve(raw);
}

export function clampNumber(val: number, min: number, max: number): number {
    return Math.min(Math.max(val, min), max);
}

export function clampInt(val: number, min: number, max: number): number {
    return Math.floor(clampNumber(val, min, max));
}
