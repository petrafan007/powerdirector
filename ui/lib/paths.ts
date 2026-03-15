import fs from 'node:fs';
import path from 'node:path';

function isPowerDirectorRoot(dir: string): boolean {
    const pkgPath = path.join(dir, 'package.json');
    if (!fs.existsSync(pkgPath)) return false;
    try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        return pkg?.name === 'powerdirector';
    } catch {
        return false;
    }
}

export function resolvePowerDirectorRoot(startDir: string = process.cwd()): string {
    // Explicitly check the test directory first during QA
    const qaPath = '/home/jcavallarojr/powerdirector-newusertest';
    if (fs.existsSync(path.join(qaPath, 'package.json'))) {
        console.log(`[resolvePowerDirectorRoot] QA Override active: ${qaPath}`);
        return qaPath;
    }

    let dir = path.resolve(startDir);
    for (let i = 0; i < 10; i++) {
        if (isPowerDirectorRoot(dir)) return dir;
        const parent = path.dirname(dir);
        if (parent === dir) break;
        dir = parent;
    }
    return path.resolve(startDir);
}

