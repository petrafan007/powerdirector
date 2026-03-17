// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveConfigBackupBasePath, resolveConfigTempPath } from './artifact-paths.js';
import { configSchema, sectionSchemas, SECRET_FIELDS, SECTION_NAMES } from './config-schema.js';
import type { PowerDirectorConfig, SectionName } from './config-schema.js';
import { validateConfigObjectRaw } from './validation.js';
import { resolveConfigPathCandidate } from './paths.js';

const CONFIG_FILENAME = 'powerdirector.config.json';
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

function detectVersion(): string {
    const envVersion = process.env.PD_VERSION?.trim();
    if (envVersion) return envVersion;

    const candidates = [
        path.join(process.cwd(), 'package.json'),
        path.resolve(process.cwd(), '..', 'package.json'),
        path.resolve(MODULE_DIR, '../../package.json'),
        path.resolve(MODULE_DIR, '../../../package.json'),
    ];

    for (const candidate of candidates) {
        try {
            if (!fs.existsSync(candidate)) continue;
            const raw = JSON.parse(fs.readFileSync(candidate, 'utf-8'));
            const name = typeof raw.name === 'string' ? raw.name.trim() : '';
            const version = typeof raw.version === 'string' ? raw.version.trim() : '';
            if (!version) continue;
            // Skip nested UI package.json to avoid reporting 0.1.0/0.0.0 style mismatches.
            if (name === 'ui') continue;
            if (name === 'powerdirector' || name === 'powerdirector') {
                return version;
            }
            if (version) {
                return raw.version.trim();
            }
        } catch {
            // Ignore parse/read errors and fall through.
        }
    }

    return '0.0.0';
}

const CURRENT_VERSION = detectVersion();

function asObject(value: any): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, any>
        : {};
}

export class ConfigManager {
    private config: PowerDirectorConfig;
    private configPath: string;
    private lastLoaded: number = 0;

    constructor(configDirOrPath?: string) {
        if (configDirOrPath) {
            if (fs.existsSync(configDirOrPath) && fs.statSync(configDirOrPath).isDirectory()) {
                this.configPath = path.join(configDirOrPath, CONFIG_FILENAME);
            } else {
                this.configPath = configDirOrPath;
            }
        } else {
            this.configPath = resolveConfigPathCandidate();
        }
        this.config = this.load();
    }

    private normalizeAuthModes(value: any): any {
        const auth = asObject(value);
        const profiles = asObject(auth.profiles);
        for (const profileValue of Object.values(profiles)) {
            const profile = asObject(profileValue);
            if (profile.mode === 'api-key') {
                profile.mode = 'api_key';
            }
        }
        auth.profiles = profiles;
        return auth;
    }

    private normalizeModelsProviders(value: any): any {
        const models = asObject(value);

        // Compatibility: older PowerDirector configs flattened providers directly under models.
        if (!Object.prototype.hasOwnProperty.call(models, 'providers')) {
            const providers: Record<string, any> = {};
            for (const [key, providerValue] of Object.entries(models)) {
                if (key === 'mode' || key === 'bedrockDiscovery') {
                    continue;
                }
                providers[key] = providerValue;
                delete models[key];
            }
            if (Object.keys(providers).length > 0) {
                models.providers = providers;
            }
        }

        const providers = asObject(models.providers);
        for (const providerValue of Object.values(providers)) {
            const provider = asObject(providerValue);
            if (typeof provider.baseUrl !== 'string' || provider.baseUrl.trim().length === 0) {
                if (typeof provider.baseURL === 'string' && provider.baseURL.trim().length > 0) {
                    provider.baseUrl = provider.baseURL.trim();
                }
            }
            if (!Array.isArray(provider.models)) {
                provider.models = [];
            }
            if (provider.auth === 'api_key') {
                provider.auth = 'api-key';
            }
        }
        models.providers = providers;
        return models;
    }

    private normalizeUpdateSection(value: any): any {
        const update = asObject(value);
        if (typeof update.autoInstall === 'boolean') {
            const auto = asObject(update.auto);
            if (typeof auto.enabled !== 'boolean') {
                auto.enabled = update.autoInstall;
            }
            update.auto = auto;
            delete update.autoInstall;
        }
        return update;
    }

    private normalizeSectionInput<T extends SectionName>(section: T, value: any): any {
        if (value === undefined) {
            return section === 'bindings' ? [] : {};
        }
        if (section === 'auth') {
            return this.normalizeAuthModes(value);
        }
        if (section === 'models') {
            return this.normalizeModelsProviders(value);
        }
        if (section === 'update') {
            return this.normalizeUpdateSection(value);
        }
        return value;
    }

    private normalizeConfigForValidation(raw: any): any {
        const next = asObject(structuredClone(raw));
        if (Object.keys(next).length === 0 && !raw) {
            return raw;
        }

        if (Object.prototype.hasOwnProperty.call(next, 'update')) {
            next.update = this.normalizeUpdateSection(next.update);
        }
        if (Object.prototype.hasOwnProperty.call(next, 'auth')) {
            next.auth = this.normalizeAuthModes(next.auth);
        }
        if (Object.prototype.hasOwnProperty.call(next, 'models')) {
            next.models = this.normalizeModelsProviders(next.models);
        }
        return next;
    }

    /** Load config from disk, or return defaults if missing/invalid */
    private load(): PowerDirectorConfig {
        try {
            if (fs.existsSync(this.configPath)) {
                const stats = fs.statSync(this.configPath);
                this.lastLoaded = stats.mtimeMs;

                const raw = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
                const normalizedRaw = this.normalizeConfigForValidation(raw);
                const result = configSchema.safeParse(normalizedRaw);
                if (result.success) {
                    return this.mergeUnknownFields(normalizedRaw, result.data) as PowerDirectorConfig;
                }
                console.warn('Config validation errors, using defaults for invalid fields:', result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`));
                // Strict validation failed (e.g. unrecognized keys). Merge raw data with
                // defaults section-by-section so valid sections are preserved.
                try {
                    const defaults = configSchema.parse({});
                    return this.mergeUnknownFields(normalizedRaw, defaults) as PowerDirectorConfig;
                } catch {
                    // If even defaults fail, just use raw as-is with best effort
                    return normalizedRaw as PowerDirectorConfig;
                }
            }
        } catch (err: any) {
            console.warn(`Failed to load config from ${this.configPath}:`, err.message);
        }
        // Return full defaults
        return configSchema.parse({});
    }

    /** Check for updates on disk */
    private sync() {
        try {
            if (fs.existsSync(this.configPath)) {
                const stats = fs.statSync(this.configPath);
                if (stats.mtimeMs > this.lastLoaded) {
                    console.log('Config file changed on disk, reloading...');
                    this.config = this.load();
                }
            }
        } catch (e) { /* ignore */ }
    }

    /** Save current config to disk */
    private save(): void {
        try {
            // Create backup
            if (fs.existsSync(this.configPath)) {
                const backupPath = resolveConfigBackupBasePath(this.configPath);
                fs.mkdirSync(path.dirname(backupPath), { recursive: true });
                fs.copyFileSync(this.configPath, backupPath);
            }

            // Ensure directory exists
            const dir = path.dirname(this.configPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Write atomically: write to temp, then rename
            const tmpPath = resolveConfigTempPath(this.configPath, `${process.pid}`);
            fs.mkdirSync(path.dirname(tmpPath), { recursive: true });
            fs.writeFileSync(tmpPath, JSON.stringify(this.config, null, 2), 'utf-8');
            fs.renameSync(tmpPath, this.configPath);

            // Update timestamp so we don't reload our own write
            const stats = fs.statSync(this.configPath);
            this.lastLoaded = stats.mtimeMs;
        } catch (err: any) {
            console.error('Failed to save config:', err.message);
            throw err;
        }
    }

    /** Get the full config (with secrets masked) */
    public getAll(maskSecrets = true): PowerDirectorConfig {
        this.sync();
        if (maskSecrets) {
            return this.maskSecrets(structuredClone(this.config));
        }
        return structuredClone(this.config);
    }

    /** Alias for getAll(false) for backward compatibility */
    public get(): PowerDirectorConfig {
        return this.getAll(false);
    }

    /** Get a specific section */
    public getSection<T extends SectionName>(section: T, maskSecrets = true): PowerDirectorConfig[T] {
        this.sync();
        if (!SECTION_NAMES.includes(section)) {
            throw new Error(`Unknown config section: ${section}`);
        }
        const value = structuredClone(this.config[section]);
        if (maskSecrets) {
            return this.maskSecretsInValue(value);
        }
        return value;
    }

    /** Update a specific section */
    public updateSection<T extends SectionName>(section: T, data: any): { success: boolean; errors?: string[] } {
        if (!SECTION_NAMES.includes(section)) {
            return { success: false, errors: [`Unknown config section: ${section}`] };
        }

        const schema = sectionSchemas[section];
        const normalizedInput = this.normalizeSectionInput(section, data);
        const result = schema.safeParse(normalizedInput);
        if (!result.success) {
            return {
                success: false,
                errors: result.error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`)
            };
        }

        // Preserve unknown keys from submitted section payload, then merge in secret handling.
        const normalized = this.mergeUnknownFields(normalizedInput, result.data);
        const merged = this.mergeSecrets(this.config[section] as any, normalized);
        const nextConfig = {
            ...this.config,
            [section]: merged,
        } as PowerDirectorConfig;
        const validatedFull = validateConfigObjectRaw(nextConfig);
        if (!validatedFull.ok) {
            return {
                success: false,
                errors: validatedFull.issues.map((i: any) => `${i.path || '<root>'}: ${i.message}`)
            };
        }
        (this.config as any)[section] = merged;
        this.save();
        return { success: true };
    }

    /** Update entire config */
    public update(data: any): { success: boolean; errors?: string[] } {
        const normalizedData = this.normalizeConfigForValidation(data);
        const result = configSchema.safeParse(normalizedData);
        if (!result.success) {
            return {
                success: false,
                errors: result.error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`)
            };
        }

        // Preserve unknown keys from submitted payload, then merge in secret handling.
        const normalized = this.mergeUnknownFields(normalizedData, result.data);
        const merged = this.mergeSecrets(this.config, normalized);
        const validatedFull = validateConfigObjectRaw(merged);
        if (!validatedFull.ok) {
            return {
                success: false,
                errors: validatedFull.issues.map((i: any) => `${i.path || '<root>'}: ${i.message}`)
            };
        }
        this.config = merged;
        this.save();
        return { success: true };
    }

    /** Export full config (unmasked) as JSON string */
    public exportConfig(): string {
        return JSON.stringify(this.config, null, 2);
    }

    /** Import config from JSON string */
    public importConfig(jsonStr: string): { success: boolean; errors?: string[] } {
        try {
            const raw = JSON.parse(jsonStr);
            const normalizedRaw = this.normalizeConfigForValidation(raw);
            const result = configSchema.safeParse(normalizedRaw);
            if (!result.success) {
                return {
                    success: false,
                    errors: result.error.issues.map((i: any) => `${i.path.join('.')}: ${i.message}`)
                };
            }
            const merged = this.mergeUnknownFields(normalizedRaw, result.data) as PowerDirectorConfig;
            const validatedFull = validateConfigObjectRaw(merged);
            if (!validatedFull.ok) {
                return {
                    success: false,
                    errors: validatedFull.issues.map((i: any) => `${i.path || '<root>'}: ${i.message}`)
                };
            }
            this.config = merged;
            this.save();
            return { success: true };
        } catch (err: any) {
            return { success: false, errors: [err.message] };
        }
    }

    /** Reset to defaults */
    public resetToDefaults(): void {
        this.config = configSchema.parse({});

        this.save();
    }

    /** Get the config file path */
    public getConfigPath(): string {
        return this.configPath;
    }

    /** Mask secrets in an object recursively */
    private maskSecrets(obj: any): any {
        return this.maskSecretsInValue(obj);
    }

    private maskSecretsInValue(obj: any): any {
        if (obj === null || obj === undefined) return obj;
        if (typeof obj === 'string') return obj;
        if (Array.isArray(obj)) return obj.map(item => this.maskSecretsInValue(item));
        if (typeof obj === 'object') {
            const masked: any = {};
            for (const [key, value] of Object.entries(obj)) {
                if (this.isSecretField(key) && typeof value === 'string' && value.length > 0) {
                    // Always redact full value for the UI as requested
                    masked[key] = '__POWERDIRECTOR_REDACTED__';
                } else {
                    masked[key] = this.maskSecretsInValue(value);
                }
            }
            return masked;
        }
        return obj;
    }

    private isSecretField(key: string): boolean {
        const lower = key.toLowerCase();
        return SECRET_FIELDS.some(f => lower.includes(f.toLowerCase()));
    }

    /** Preserve unknown keys from raw payloads while keeping validated known values. */
    private mergeUnknownFields(raw: any, validated: any): any {
        if (validated === undefined) {
            return raw;
        }
        if (validated === null || typeof validated !== 'object') {
            return validated;
        }
        if (Array.isArray(validated)) {
            return validated;
        }

        const rawObj = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
        const validatedObj = validated as Record<string, any>;
        const merged: Record<string, any> = {};
        const keys = new Set([...Object.keys(rawObj), ...Object.keys(validatedObj)]);

        for (const key of keys) {
            if (!(key in validatedObj)) {
                merged[key] = rawObj[key];
                continue;
            }
            const validatedValue = validatedObj[key];
            const rawValue = rawObj[key];
            if (validatedValue && typeof validatedValue === 'object' && !Array.isArray(validatedValue)) {
                merged[key] = this.mergeUnknownFields(rawValue, validatedValue);
            } else {
                merged[key] = validatedValue;
            }
        }

        return merged;
    }

    /** When updating, keep original secret values if the user submitted the masked version */
    private mergeSecrets(original: any, updated: any): any {
        if (updated === undefined) {
            return original;
        }
        if (updated === null || typeof updated !== 'object') {
            return updated;
        }
        if (Array.isArray(updated)) {
            return updated;
        }

        const originalObj = (original && typeof original === 'object' && !Array.isArray(original))
            ? original
            : {};
        const updatedObj = updated as Record<string, any>;
        const merged: Record<string, any> = {};
        const keys = Object.keys(updatedObj);

        for (const key of keys) {
            const value = updatedObj[key];
            const originalValue = (originalObj as Record<string, any>)[key];
            if (this.isSecretField(key) && typeof value === 'string') {
                // If the value contains the redaction string, OR the old redaction format, keep original
                const isMasked = value === '__POWERDIRECTOR_REDACTED__' ||
                    value.includes('__POWERDIRECTOR_REDACTED__') ||
                    value.includes('•');

                if (isMasked && originalValue) {
                    merged[key] = originalValue;
                } else {
                    merged[key] = value;
                }
            } else if (value && typeof value === 'object' && !Array.isArray(value) && originalValue) {
                merged[key] = this.mergeSecrets(originalValue, value);
            } else {
                merged[key] = value;
            }
        }
        return merged;
    }
}

// Singleton
let _instance: ConfigManager | null = null;

export function getConfigManager(): ConfigManager {
    if (!_instance) {
        _instance = new ConfigManager();
    }
    return _instance;
}
