// @ts-nocheck
import path from 'node:path';
import { safeHomedir } from '../../infra/os-safe.js';

export function resolveUserPath(raw: string): string {
    if (raw.startsWith('~/')) {
        return path.join(safeHomedir(), raw.slice(2));
    }
    return path.resolve(raw);
}

export function clampNumber(val: number, min: number, max: number): number {
    return Math.min(Math.max(val, min), max);
}

export function clampInt(val: number, min: number, max: number): number {
    return Math.floor(clampNumber(val, min, max));
}
