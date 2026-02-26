import { ConfigManager } from '@/src-backend/config/config-manager';
import { resolvePowerDirectorRoot } from './paths';
import fs from 'node:fs';
import path from 'node:path';

// Shared ConfigManager singleton for the Next.js app
let _configManager: ConfigManager | null = null;

function loadDotenv(rootDir: string) {
    const config = new ConfigManager(rootDir).getAll(false) as any;
    let dotenvPath = config?.env?.dotenvPath;

    console.log(`[ConfigInstance] Initializing environment. Configured dotenvPath: ${dotenvPath || 'none'}`);

    if (dotenvPath) {
        if (dotenvPath.startsWith('~/')) {
            dotenvPath = path.join(process.env.HOME || '', dotenvPath.slice(2));
        }

        if (fs.existsSync(dotenvPath)) {
            const stats = fs.statSync(dotenvPath);
            if (stats.isDirectory()) {
                dotenvPath = path.join(dotenvPath, '.env');
            }

            if (fs.existsSync(dotenvPath)) {
                try {
                    console.log(`[ConfigInstance] Loading .env from: ${dotenvPath}`);
                    const content = fs.readFileSync(dotenvPath, 'utf-8');
                    const lines = content.split('\n');
                    let count = 0;
                    for (let line of lines) {
                        line = line.trim();
                        if (!line || line.startsWith('#')) continue;
                        const eqIndex = line.indexOf('=');
                        if (eqIndex <= 0) continue;
                        const key = line.slice(0, eqIndex).trim();
                        let value = line.slice(eqIndex + 1).trim();
                        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
                            value = value.slice(1, -1);
                        }
                        if (key && !process.env[key]) {
                            process.env[key] = value;
                            count++;
                        }
                    }
                    console.log(`[ConfigInstance] Successfully loaded ${count} environment variables from .env`);
                } catch (err: any) {
                    console.warn(`[ConfigInstance] Failed to parse dotenv file at ${dotenvPath}: ${err.message}`);
                }
            } else {
                console.log(`[ConfigInstance] .env file not found at path: ${dotenvPath}`);
            }
        } else {
            console.log(`[ConfigInstance] dotenvPath does not exist: ${dotenvPath}`);
        }
    } else {
        // Fallback to local .env in root if no path configured
        const localEnv = path.join(rootDir, '.env');
        if (fs.existsSync(localEnv)) {
            console.log(`[ConfigInstance] Found local .env at ${localEnv}, attempting to load...`);
            // Recursively call with root path to avoid code duplication
            // But let's just implement inline for safety
            try {
                const content = fs.readFileSync(localEnv, 'utf-8');
                const lines = content.split('\n');
                for (let line of lines) {
                    line = line.trim();
                    if (!line || line.startsWith('#')) continue;
                    const eqIndex = line.indexOf('=');
                    if (eqIndex <= 0) continue;
                    const key = line.slice(0, eqIndex).trim();
                    let value = line.slice(eqIndex + 1).trim();
                    if (key && !process.env[key]) process.env[key] = value;
                }
                console.log(`[ConfigInstance] Loaded local .env successfully.`);
            } catch { }
        }
    }
}

export function getConfigManager(): ConfigManager {
    if (!_configManager) {
        const root = resolvePowerDirectorRoot();
        loadDotenv(root);
        _configManager = new ConfigManager(root);
    }
    return _configManager;
}
