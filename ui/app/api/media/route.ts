import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const targetPath = url.searchParams.get('path');

    if (!targetPath) {
        return new NextResponse('Missing path query parameter', { status: 400 });
    }

    try {
        const cwd = process.cwd();
        const candidates = new Set<string>();

        // Absolute input paths should be honored directly.
        if (path.isAbsolute(targetPath)) {
            candidates.add(path.normalize(targetPath));
        } else {
            // Relative input paths: check common runtime roots.
            candidates.add(path.resolve(cwd, targetPath));
            candidates.add(path.resolve(cwd, '..', targetPath));
            candidates.add(path.resolve(cwd, '..', '..', targetPath));
            candidates.add(path.resolve(cwd, 'media', targetPath));
            candidates.add(path.resolve(cwd, '..', 'media', targetPath));
            candidates.add(path.resolve(cwd, '..', '..', 'media', targetPath));
            candidates.add(path.resolve(cwd, '..', '..', 'agent', 'media', targetPath));
        }

        let resolvedPath: string | null = null;
        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) {
                resolvedPath = candidate;
                break;
            }
        }
        if (!resolvedPath) {
            return new NextResponse('File not found', { status: 404 });
        }

        // Basic check to ensure it exists and is a file
        const stat = await fs.promises.stat(resolvedPath);
        if (!stat.isFile()) {
            return new NextResponse('Not a file', { status: 400 });
        }

        const ext = path.extname(resolvedPath).toLowerCase();
        let mimeType = 'application/octet-stream';
        if (ext === '.png') mimeType = 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
        if (ext === '.webp') mimeType = 'image/webp';
        if (ext === '.gif') mimeType = 'image/gif';
        if (ext === '.svg') mimeType = 'image/svg+xml';
        if (ext === '.mp4') mimeType = 'video/mp4';
        if (ext === '.webm') mimeType = 'video/webm';
        if (ext === '.mov') mimeType = 'video/quicktime';

        const fileBuffer = await fs.promises.readFile(resolvedPath);

        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': mimeType,
                'Cache-Control': 'public, max-age=86400',
            },
        });
    } catch (e: any) {
        return new NextResponse(`Error: ${e.message}`, { status: 500 });
    }
}
