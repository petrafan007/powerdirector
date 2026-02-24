
import { NextResponse } from 'next/server';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { resolvePowerDirectorRoot } from '../../../../lib/paths';

export async function GET() {
    let pkg = { version: 'unknown' };
    try {
        const rootDir = resolvePowerDirectorRoot();
        const pkgPath = path.join(rootDir, 'package.json');
        if (fs.existsSync(pkgPath)) {
            pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        }
    } catch (e) {
        console.error('Failed to read package.json', e);
    }

    return NextResponse.json({
        env: process.env.NODE_ENV || 'development',
        version: pkg.version,
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
        cpu: os.cpus()[0].model,
        cores: os.cpus().length,
        memory: os.totalmem(),
    });
}
