// @ts-nocheck
import crypto from "node:crypto";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";

export type MemoryChunk = {
    startLine: number;
    endLine: number;
    text: string;
    hash: string;
};

export type MemoryFileEntry = {
    path: string;
    absPath: string;
    mtimeMs: number;
    size: number;
    hash: string;
};

function walkDirSync(dir: string, files: string[]): void {
    let entries: fsSync.Dirent[] = [];
    try {
        entries = fsSync.readdirSync(dir, { withFileTypes: true });
    } catch {
        return;
    }
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isSymbolicLink()) {
            continue;
        }
        if (entry.isDirectory()) {
            walkDirSync(full, files);
            continue;
        }
        if (!entry.isFile()) {
            continue;
        }
        if (!entry.name.toLowerCase().endsWith(".md")) {
            continue;
        }
        files.push(full);
    }
}

export function hashText(value: string): string {
    return crypto.createHash("sha256").update(value).digest("hex");
}

export function chunkMarkdown(
    content: string,
    chunking: { tokens: number; overlap: number },
): MemoryChunk[] {
    const lines = content.split("\n");
    if (lines.length === 0) {
        return [];
    }
    const maxChars = Math.max(32, Math.floor(chunking.tokens) * 4);
    const overlapChars = Math.max(0, Math.floor(chunking.overlap) * 4);
    const chunks: MemoryChunk[] = [];
    let current: Array<{ line: string; lineNo: number }> = [];
    let currentChars = 0;

    const flush = () => {
        if (current.length === 0) {
            return;
        }
        const first = current[0];
        const last = current[current.length - 1];
        const text = current.map((entry) => entry.line).join("\n");
        chunks.push({
            startLine: first.lineNo,
            endLine: last.lineNo,
            text,
            hash: hashText(text),
        });
    };

    const carryOverlap = () => {
        if (overlapChars <= 0 || current.length === 0) {
            current = [];
            currentChars = 0;
            return;
        }
        const kept: Array<{ line: string; lineNo: number }> = [];
        let acc = 0;
        for (let i = current.length - 1; i >= 0; i -= 1) {
            const entry = current[i];
            acc += entry.line.length + 1;
            kept.unshift(entry);
            if (acc >= overlapChars) {
                break;
            }
        }
        current = kept;
        currentChars = kept.reduce((sum, entry) => sum + entry.line.length + 1, 0);
    };

    for (let i = 0; i < lines.length; i += 1) {
        const sourceLine = lines[i] ?? "";
        const lineNo = i + 1;
        const segments: string[] = [];
        if (sourceLine.length === 0) {
            segments.push("");
        } else {
            for (let start = 0; start < sourceLine.length; start += maxChars) {
                segments.push(sourceLine.slice(start, start + maxChars));
            }
        }
        for (const segment of segments) {
            const lineSize = segment.length + 1;
            if (currentChars + lineSize > maxChars && current.length > 0) {
                flush();
                carryOverlap();
            }
            current.push({ line: segment, lineNo });
            currentChars += lineSize;
        }
    }
    flush();
    return chunks;
}

export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0) {
        return 0;
    }
    const len = Math.min(a.length, b.length);
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < len; i += 1) {
        const av = a[i] ?? 0;
        const bv = b[i] ?? 0;
        dot += av * bv;
        normA += av * av;
        normB += bv * bv;
    }
    if (normA === 0 || normB === 0) {
        return 0;
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function normalizeExtraPaths(workspaceDir: string, rawPaths: string[]): string[] {
    const normalized = rawPaths
        .map((value) => value.trim())
        .filter(Boolean)
        .map((value) => (path.isAbsolute(value) ? value : path.resolve(workspaceDir, value)));
    return Array.from(new Set(normalized));
}

export async function listMemoryFiles(
    workspaceDir: string,
    extraPaths: string[],
): Promise<string[]> {
    const files: string[] = [];
    const pushIfMarkdownFile = async (absPath: string) => {
        try {
            const stat = await fs.lstat(absPath);
            if (stat.isSymbolicLink() || !stat.isFile()) {
                return;
            }
            if (!absPath.toLowerCase().endsWith(".md")) {
                return;
            }
            files.push(absPath);
        } catch {
            // ignore unreadable/missing paths
        }
    };

    await pushIfMarkdownFile(path.join(workspaceDir, "MEMORY.md"));
    await pushIfMarkdownFile(path.join(workspaceDir, "memory.md"));

    const memoryDir = path.join(workspaceDir, "memory");
    try {
        const stat = await fs.lstat(memoryDir);
        if (!stat.isSymbolicLink() && stat.isDirectory()) {
            walkDirSync(memoryDir, files);
        }
    } catch {
        // ignore
    }

    for (const rawPath of normalizeExtraPaths(workspaceDir, extraPaths)) {
        try {
            const stat = await fs.lstat(rawPath);
            if (stat.isSymbolicLink()) {
                continue;
            }
            if (stat.isDirectory()) {
                walkDirSync(rawPath, files);
                continue;
            }
            if (stat.isFile()) {
                await pushIfMarkdownFile(rawPath);
            }
        } catch {
            // ignore
        }
    }

    const deduped: string[] = [];
    const seen = new Set<string>();
    for (const file of files) {
        let key = file;
        try {
            key = await fs.realpath(file);
        } catch {
            // keep original path as dedupe key fallback
        }
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        deduped.push(file);
    }
    return deduped;
}

export async function buildMemoryFileEntry(absPath: string, workspaceDir: string): Promise<MemoryFileEntry> {
    const stat = await fs.stat(absPath);
    const content = await fs.readFile(absPath, "utf8");
    return {
        path: path.relative(workspaceDir, absPath).replace(/\\/g, "/"),
        absPath,
        mtimeMs: stat.mtimeMs,
        size: stat.size,
        hash: hashText(content),
    };
}
