#!/usr/bin/env node
const { spawnSync } = require('child_process');

const env = { ...process.env };
// Ensure TURBOPACK is completely purged from the environment so it doesn't
// conflict with --webpack when spawned from a flawed legacy update runner.
delete env.TURBOPACK;

const isWin = process.platform === 'win32';
const npx = isWin ? 'npx.cmd' : 'npx';

const result = spawnSync(npx, ['next', 'build', '--webpack'], {
    stdio: 'inherit',
    env,
    shell: isWin
});

process.exitCode = result.status ?? 1;

if (process.exitCode === 0) {
    // Rescue old updater daemons that still check for the legacy Vite build output
    const fs = require('fs');
    const path = require('path');
    const dummyDir = path.resolve(__dirname, '../../dist/control-ui');
    fs.mkdirSync(dummyDir, { recursive: true });
    fs.writeFileSync(path.join(dummyDir, 'index.html'), '<html><body>Next.js UI Server</body></html>', 'utf-8');
}
process.exit(process.exitCode);
