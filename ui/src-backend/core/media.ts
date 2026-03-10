// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
import { resolveDefaultMediaStorageDir } from '../infra/runtime-paths';

type ImageProvider = 'openai' | 'stability' | 'google';
type ImageSize = '256x256' | '512x512' | '1024x1024' | string;

interface ImageGenerationConfig {
    enabled?: boolean;
    provider?: ImageProvider;
    model?: string;
    defaultSize?: ImageSize;
}

interface TranscriptionConfig {
    timeoutSeconds?: number;
}

export interface MediaConfig {
    imageGeneration?: ImageGenerationConfig;
    audio?: {
        transcription?: TranscriptionConfig;
    };
    preserveFilenames?: boolean;
    maxUploadSize?: number; // MB
    allowedMimeTypes?: string[];
    storageDir?: string;
}

export interface MediaUploadMetadata {
    name?: string;
    mimeType?: string;
    sizeBytes?: number;
}

export class MediaManager {
    private readonly imageGenerationEnabled: boolean;
    private readonly imageProvider: ImageProvider;
    private readonly imageModel: string;
    private readonly defaultSize: ImageSize;
    private readonly preserveFilenames: boolean;
    private readonly maxUploadBytes: number;
    private readonly allowedMimeTypes: string[];
    private readonly storageDir: string;
    private readonly transcriptionTimeoutSeconds: number;

    constructor(config: MediaConfig = {}, baseDir: string = process.cwd()) {
        this.imageGenerationEnabled = config.imageGeneration?.enabled !== false;
        this.imageProvider = config.imageGeneration?.provider || 'google';
        this.imageModel = typeof config.imageGeneration?.model === 'string'
            ? config.imageGeneration.model.trim()
            : '';
        this.defaultSize = config.imageGeneration?.defaultSize || '1024x1024';
        this.preserveFilenames = config.preserveFilenames === true;
        this.maxUploadBytes = Math.max(1, Math.floor(config.maxUploadSize ?? 50)) * 1024 * 1024;
        this.allowedMimeTypes = Array.isArray(config.allowedMimeTypes)
            ? config.allowedMimeTypes.filter((type) => typeof type === 'string' && type.trim().length > 0).map((type) => type.trim())
            : [];
        const rawStorage = typeof config.storageDir === 'string' ? config.storageDir.trim() : '';
        this.storageDir = rawStorage
            ? (path.isAbsolute(rawStorage) ? rawStorage : path.join(baseDir, rawStorage))
            : resolveDefaultMediaStorageDir();

        if (!fs.existsSync(this.storageDir)) {
            fs.mkdirSync(this.storageDir, { recursive: true });
        }
        this.transcriptionTimeoutSeconds = config.audio?.transcription?.timeoutSeconds ?? 30;
    }

    public getStatus(): {
        imageGenerationEnabled: boolean;
        imageProvider: ImageProvider;
        imageModel: string;
        defaultSize: string;
        preserveFilenames: boolean;
        maxUploadBytes: number;
        allowedMimeTypes: string[];
        storageDir: string;
        transcriptionTimeoutSeconds: number;
    } {
        return {
            imageGenerationEnabled: this.imageGenerationEnabled,
            imageProvider: this.imageProvider,
            imageModel: this.imageModel,
            defaultSize: String(this.defaultSize),
            preserveFilenames: this.preserveFilenames,
            maxUploadBytes: this.maxUploadBytes,
            allowedMimeTypes: [...this.allowedMimeTypes],
            storageDir: this.storageDir,
            transcriptionTimeoutSeconds: this.transcriptionTimeoutSeconds
        };
    }

    public getImageDefaults(): {
        enabled: boolean;
        provider: ImageProvider;
        model: string;
        size: string;
        preserveFilenames: boolean;
        storageDir: string;
    } {
        return {
            enabled: this.imageGenerationEnabled,
            provider: this.imageProvider,
            model: this.imageModel,
            size: String(this.defaultSize),
            preserveFilenames: this.preserveFilenames,
            storageDir: this.storageDir
        };
    }

    public validateUpload(upload: MediaUploadMetadata): { ok: true } | { ok: false; error: string } {
        const size = typeof upload.sizeBytes === 'number' && Number.isFinite(upload.sizeBytes)
            ? Math.max(0, Math.floor(upload.sizeBytes))
            : 0;
        if (size > this.maxUploadBytes) {
            return {
                ok: false,
                error: `Upload "${upload.name || 'file'}" exceeds max size ${this.maxUploadBytes} bytes.`
            };
        }

        const mimeType = typeof upload.mimeType === 'string' ? upload.mimeType.trim() : '';
        if (this.allowedMimeTypes.length > 0 && mimeType && !this.allowedMimeTypes.includes(mimeType)) {
            return {
                ok: false,
                error: `Upload "${upload.name || 'file'}" has disallowed mime type "${mimeType}".`
            };
        }

        if (this.allowedMimeTypes.length > 0 && !mimeType) {
            return {
                ok: false,
                error: `Upload "${upload.name || 'file'}" is missing mime type.`
            };
        }

        return { ok: true };
    }

    public validateUploads(uploads: MediaUploadMetadata[]): { ok: true } | { ok: false; error: string } {
        for (const upload of uploads || []) {
            const result = this.validateUpload(upload);
            if (!result.ok) return result;
        }
        return { ok: true };
    }
}
