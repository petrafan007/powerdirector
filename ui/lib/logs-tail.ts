import fs from 'node:fs/promises';
import path from 'node:path';
import { getRuntimeLogger } from '@/src-backend/core/logger';

const DEFAULT_LIMIT = 500;
const DEFAULT_MAX_BYTES = 250_000;
const MAX_LIMIT = 5_000;
const MAX_BYTES = 1_000_000;
const ROLLING_LOG_RE = /^powerdirector-\d{4}-\d{2}-\d{2}\.log$/;

export type LogsTailParams = {
    cursor?: number;
    limit?: number;
    maxBytes?: number;
};

export type LogsTailResult = {
    file: string;
    cursor: number;
    size: number;
    lines: string[];
    truncated: boolean;
    reset: boolean;
};

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function isRollingLogFile(filePath: string): boolean {
    return ROLLING_LOG_RE.test(path.basename(filePath));
}

async function resolveLogFile(filePath: string): Promise<string> {
    const fileStat = await fs.stat(filePath).catch(() => null);
    if (fileStat) {
        return filePath;
    }
    if (!isRollingLogFile(filePath)) {
        return filePath;
    }

    const dir = path.dirname(filePath);
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => null);
    if (!entries) {
        return filePath;
    }

    const candidates = await Promise.all(
        entries
            .filter((entry) => entry.isFile() && ROLLING_LOG_RE.test(entry.name))
            .map(async (entry) => {
                const fullPath = path.join(dir, entry.name);
                const stat = await fs.stat(fullPath).catch(() => null);
                return stat ? { filePath: fullPath, mtimeMs: stat.mtimeMs } : null;
            })
    );

    const sorted = candidates
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .sort((a, b) => b.mtimeMs - a.mtimeMs);

    return sorted[0]?.filePath ?? filePath;
}

async function readLogSlice(params: {
    file: string;
    cursor?: number;
    limit: number;
    maxBytes: number;
}): Promise<Omit<LogsTailResult, 'file'>> {
    const stat = await fs.stat(params.file).catch(() => null);
    if (!stat) {
        return {
            cursor: 0,
            size: 0,
            lines: [],
            truncated: false,
            reset: false
        };
    }

    const size = stat.size;
    const maxBytes = clamp(params.maxBytes, 1, MAX_BYTES);
    const limit = clamp(params.limit, 1, MAX_LIMIT);
    let cursor = typeof params.cursor === 'number' && Number.isFinite(params.cursor)
        ? Math.max(0, Math.floor(params.cursor))
        : undefined;
    let reset = false;
    let truncated = false;
    let start = 0;

    if (cursor != null) {
        if (cursor > size) {
            reset = true;
            start = Math.max(0, size - maxBytes);
            truncated = start > 0;
        } else {
            start = cursor;
            if (size - start > maxBytes) {
                reset = true;
                truncated = true;
                start = Math.max(0, size - maxBytes);
            }
        }
    } else {
        start = Math.max(0, size - maxBytes);
        truncated = start > 0;
    }

    if (size === 0 || size <= start) {
        return {
            cursor: size,
            size,
            lines: [],
            truncated,
            reset
        };
    }

    const handle = await fs.open(params.file, 'r');
    try {
        let prefix = '';
        if (start > 0) {
            const prefixBuf = Buffer.alloc(1);
            const prefixRead = await handle.read(prefixBuf, 0, 1, start - 1);
            prefix = prefixBuf.toString('utf8', 0, prefixRead.bytesRead);
        }

        const length = Math.max(0, size - start);
        const buffer = Buffer.alloc(length);
        const readResult = await handle.read(buffer, 0, length, start);
        const text = buffer.toString('utf8', 0, readResult.bytesRead);

        let lines = text.split('\n');
        if (start > 0 && prefix !== '\n') {
            lines = lines.slice(1);
        }
        if (lines.length > 0 && lines[lines.length - 1] === '') {
            lines = lines.slice(0, -1);
        }
        if (lines.length > limit) {
            lines = lines.slice(lines.length - limit);
        }

        cursor = size;
        return {
            cursor,
            size,
            lines,
            truncated,
            reset
        };
    } finally {
        await handle.close();
    }
}

export async function tailLogs(params: LogsTailParams = {}): Promise<LogsTailResult> {
    const configuredFile = getRuntimeLogger().getConfig().file;
    const file = await resolveLogFile(configuredFile);
    const slice = await readLogSlice({
        file,
        cursor: params.cursor,
        limit: params.limit ?? DEFAULT_LIMIT,
        maxBytes: params.maxBytes ?? DEFAULT_MAX_BYTES
    });

    return {
        file,
        ...slice
    };
}
