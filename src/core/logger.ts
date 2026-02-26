// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
import util from 'node:util';

export type RuntimeLogLevel = 'silent' | 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
export type RuntimeConsoleStyle = 'pretty' | 'compact' | 'json';
export type RuntimeRedactSensitiveMode = 'off' | 'tools';

export interface RuntimeLoggingConfig {
    level?: RuntimeLogLevel;
    file?: string;
    consoleLevel?: RuntimeLogLevel;
    consoleStyle?: RuntimeConsoleStyle;
    redactSensitive?: RuntimeRedactSensitiveMode;
    redactPatterns?: string[];
}

interface ResolvedLoggingConfig {
    level: RuntimeLogLevel;
    file: string;
    consoleLevel: RuntimeLogLevel;
    consoleStyle: RuntimeConsoleStyle;
    redactSensitive: RuntimeRedactSensitiveMode;
    redactPatterns: RegExp[];
}

const LEVEL_WEIGHTS: Record<RuntimeLogLevel, number> = {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5,
    silent: Number.POSITIVE_INFINITY
};

const COLOR_CODES: Record<Exclude<RuntimeLogLevel, 'silent'>, string> = {
    fatal: '\x1b[35m',
    trace: '\x1b[90m',
    debug: '\x1b[36m',
    info: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m'
};

const COLOR_RESET = '\x1b[0m';
const DEFAULT_REDACT_MODE: RuntimeRedactSensitiveMode = 'tools';
const DEFAULT_REDACT_PATTERNS: string[] = [
    String.raw`\b[A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD)\b\s*[=:]\s*(["']?)([^\s"'\\]+)\1`,
    String.raw`"(?:apiKey|token|secret|password|passwd|accessToken|refreshToken)"\s*:\s*"([^"]+)"`,
    String.raw`--(?:api[-_]?key|token|secret|password|passwd)\s+(["']?)([^\s"']+)\1`,
    String.raw`Authorization\s*[:=]\s*Bearer\s+([A-Za-z0-9._\-+=]+)`,
    String.raw`\bBearer\s+([A-Za-z0-9._\-+=]{18,})\b`,
    String.raw`-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]+?-----END [A-Z ]*PRIVATE KEY-----`,
    String.raw`\b(sk-[A-Za-z0-9_-]{8,})\b`,
    String.raw`\b(ghp_[A-Za-z0-9]{20,})\b`,
    String.raw`\b(github_pat_[A-Za-z0-9_]{20,})\b`,
    String.raw`\b(xox[baprs]-[A-Za-z0-9-]{10,})\b`,
    String.raw`\b(xapp-[A-Za-z0-9-]{10,})\b`,
    String.raw`\b(gsk_[A-Za-z0-9_-]{10,})\b`,
    String.raw`\b(AIza[0-9A-Za-z\-_]{20,})\b`,
    String.raw`\b(pplx-[A-Za-z0-9_-]{10,})\b`,
    String.raw`\b(npm_[A-Za-z0-9]{10,})\b`,
    String.raw`\bbot(\d{6,}:[A-Za-z0-9_-]{20,})\b`,
    String.raw`\b(\d{6,}:[A-Za-z0-9_-]{20,})\b`
];
const DEFAULT_LOG_DIR = path.join(process.cwd(), 'logs');

function formatLocalDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function defaultRollingPathForToday(): string {
    const today = formatLocalDate(new Date());
    return path.join(DEFAULT_LOG_DIR, `powerdirector-${today}.log`);
}

function sanitizeFilePath(filePath: string | undefined, baseDir: string): string {
    const trimmed = (filePath || '').trim();
    if (!trimmed) {
        return defaultRollingPathForToday();
    }
    if (path.isAbsolute(trimmed)) {
        return trimmed;
    }
    return path.join(baseDir, trimmed);
}

function normalizeLogLevel(level: string | undefined, fallback: RuntimeLogLevel = 'info'): RuntimeLogLevel {
    const candidate = (level || fallback).trim();
    if (candidate === 'silent'
        || candidate === 'fatal'
        || candidate === 'error'
        || candidate === 'warn'
        || candidate === 'info'
        || candidate === 'debug'
        || candidate === 'trace') {
        return candidate;
    }
    return fallback;
}

function normalizeConsoleStyle(style: string | undefined): RuntimeConsoleStyle {
    if (style === 'pretty' || style === 'compact' || style === 'json') {
        return style;
    }
    if (!process.stdout.isTTY) {
        return 'compact';
    }
    return 'pretty';
}

function normalizeRedactMode(mode: string | undefined): RuntimeRedactSensitiveMode {
    return mode === 'off' ? 'off' : DEFAULT_REDACT_MODE;
}

function parsePattern(raw: string): RegExp | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const slashPattern = trimmed.match(/^\/(.+)\/([a-z]*)$/i);
    try {
        if (slashPattern) {
            const flags = slashPattern[2].includes('g') ? slashPattern[2] : `${slashPattern[2]}g`;
            return new RegExp(slashPattern[1], flags);
        }
        return new RegExp(trimmed, 'gi');
    } catch {
        return null;
    }
}

function resolveRedactPatterns(patterns: string[] | undefined): RegExp[] {
    const source = Array.isArray(patterns) && patterns.length > 0 ? patterns : DEFAULT_REDACT_PATTERNS;
    return source.map(parsePattern).filter((entry): entry is RegExp => Boolean(entry));
}

function formatArgs(args: unknown[]): string {
    return util.format(...args);
}

function maskToken(token: string): string {
    if (token.length < 18) return '***';
    return `${token.slice(0, 6)}...${token.slice(-4)}`;
}

function redactMatch(match: string, groups: string[]): string {
    const token = groups.filter((value) => typeof value === 'string' && value.length > 0).at(-1) || match;
    const masked = maskToken(token);
    if (token === match) return masked;
    return match.replace(token, masked);
}

function redactText(text: string, patterns: RegExp[]): string {
    let value = text;
    for (const pattern of patterns) {
        value = value.replace(pattern, (...args: string[]) => {
            const groups = args.slice(1, args.length - 2);
            return redactMatch(args[0], groups);
        });
    }
    return value;
}

function toPrettyTime(ts: Date): string {
    const hh = String(ts.getHours()).padStart(2, '0');
    const mm = String(ts.getMinutes()).padStart(2, '0');
    const ss = String(ts.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}

function shouldLog(level: RuntimeLogLevel, threshold: RuntimeLogLevel): boolean {
    if (threshold === 'silent') return false;
    return LEVEL_WEIGHTS[level] <= LEVEL_WEIGHTS[threshold];
}

export class RuntimeLogger {
    private config: ResolvedLoggingConfig = {
        level: 'info',
        file: defaultRollingPathForToday(),
        consoleLevel: 'info',
        consoleStyle: process.stdout.isTTY ? 'pretty' : 'compact',
        redactSensitive: DEFAULT_REDACT_MODE,
        redactPatterns: resolveRedactPatterns(undefined)
    };
    private patched = false;
    private readonly originalConsole = {
        log: console.log.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        debug: (console.debug || console.log).bind(console),
        trace: (console.trace || console.log).bind(console)
    };

    public configure(config: RuntimeLoggingConfig = {}, baseDir: string = process.cwd()): void {
        this.config = {
            level: normalizeLogLevel(config.level, 'info'),
            file: sanitizeFilePath(config.file, baseDir),
            consoleLevel: normalizeLogLevel(config.consoleLevel, 'info'),
            consoleStyle: normalizeConsoleStyle(config.consoleStyle),
            redactSensitive: normalizeRedactMode(config.redactSensitive),
            redactPatterns: resolveRedactPatterns(config.redactPatterns)
        };

        if (this.config.level !== 'silent') {
            const dir = path.dirname(this.config.file);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }

        this.patchConsole();
    }

    public getConfig(): ResolvedLoggingConfig {
        return { ...this.config };
    }

    public trace(...args: unknown[]): void {
        this.write('trace', args);
    }

    public debug(...args: any[]): void {
        this.write('debug', args);
    }

    public info(...args: any[]): void {
        this.write('info', args);
    }

    public warn(...args: any[]): void {
        this.write('warn', args);
    }

    public error(...args: any[]): void {
        this.write('error', args);
    }

    public fatal(...args: unknown[]): void {
        this.write('fatal', args);
    }

    private patchConsole(): void {
        if (this.patched) return;
        this.patched = true;

        console.log = (...args: any[]) => this.write('info', args);
        console.info = (...args: any[]) => this.write('info', args);
        console.warn = (...args: any[]) => this.write('warn', args);
        console.error = (...args: any[]) => this.write('error', args);
        console.debug = (...args: any[]) => this.write('debug', args);
        console.trace = (...args: any[]) => this.write('trace', args);
    }

    private write(level: RuntimeLogLevel, args: unknown[]): void {
        const raw = formatArgs(args);
        const redactedMessage = this.config.redactSensitive === 'tools'
            ? redactText(raw, this.config.redactPatterns)
            : raw;
        const now = new Date();
        const iso = now.toISOString();

        if (shouldLog(level, this.config.consoleLevel)) {
            const line = this.formatConsoleLine(level, redactedMessage, now, iso);
            const stream = level === 'fatal' || level === 'error' || level === 'warn'
                ? process.stderr
                : process.stdout;
            try {
                stream.write(`${line}\n`);
            } catch {
                // never block execution on logging failures
            }
        }

        if (shouldLog(level, this.config.level)) {
            try {
                const payload = JSON.stringify({
                    time: iso,
                    level,
                    msg: redactedMessage
                });
                fs.appendFileSync(this.config.file, `${payload}\n`, 'utf-8');
            } catch (error) {
                this.originalConsole.error('Failed to write log file:', error);
            }
        }
    }

    private formatConsoleLine(level: RuntimeLogLevel, message: string, now: Date, iso: string): string {
        if (this.config.consoleStyle === 'json') {
            return JSON.stringify({ time: iso, level, msg: message });
        }

        const timestamp = this.config.consoleStyle === 'pretty' ? toPrettyTime(now) : iso;
        const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
        if (this.config.consoleStyle === 'pretty' && process.stdout.isTTY && level !== 'silent') {
            const color = COLOR_CODES[level];
            if (color) {
                return `${color}${prefix}${COLOR_RESET} ${message}`;
            }
        }
        return `${prefix} ${message}`;
    }
}

let singleton: RuntimeLogger | null = null;

export function getRuntimeLogger(): RuntimeLogger {
    if (!singleton) singleton = new RuntimeLogger();
    return singleton;
}

export function configureRuntimeLogging(config: RuntimeLoggingConfig = {}, baseDir: string = process.cwd()): RuntimeLogger {
    const logger = getRuntimeLogger();
    logger.configure(config, baseDir);
    return logger;
}
