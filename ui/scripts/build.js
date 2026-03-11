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

process.exit(result.status ?? 1);
