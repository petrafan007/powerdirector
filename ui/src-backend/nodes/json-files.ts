// @ts-nocheck
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
    try {
        const raw = await fs.readFile(filePath, 'utf8');
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export async function writeJsonAtomic(
    filePath: string,
    value: unknown,
    options?: { mode?: number }
): Promise<void> {
    const mode = options?.mode ?? 0o600;
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    const tmpPath = `${filePath}.${randomUUID()}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(value, null, 2), 'utf8');
    try {
        await fs.chmod(tmpPath, mode);
    } catch {
        // Best effort on platforms without chmod support.
    }
    await fs.rename(tmpPath, filePath);
    try {
        await fs.chmod(filePath, mode);
    } catch {
        // Best effort on platforms without chmod support.
    }
}

export function createAsyncLock() {
    let lock: Promise<void> = Promise.resolve();

    return async function withLock<T>(fn: () => Promise<T>): Promise<T> {
        const previous = lock;
        let release: (() => void) | undefined;
        lock = new Promise<void>((resolve) => {
            release = resolve;
        });
        await previous;
        try {
            return await fn();
        } finally {
            release?.();
        }
    };
}
