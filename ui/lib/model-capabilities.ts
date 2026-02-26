// ═══════════════════════════════════════════════════════════
// MODEL CAPABILITIES REGISTRY
// Maps model/provider IDs to their attachment capabilities
// ═══════════════════════════════════════════════════════════

export interface ModelCapabilities {
    vision: boolean;       // Can process images (jpg, png, gif, webp)
    documents: boolean;    // Can process PDFs/documents natively
    fileUpload: boolean;   // Has a server-side Files API
}

// Per-model overrides (only models that deviate from provider defaults)
const MODEL_OVERRIDES: Record<string, Partial<ModelCapabilities>> = {
    // DeepSeek models have NO vision
    'deepseek-v3.2': { vision: false, documents: false, fileUpload: false },
    'deepseek-r1': { vision: false, documents: false, fileUpload: false },
};

// Provider-level defaults
const PROVIDER_DEFAULTS: Record<string, ModelCapabilities> = {
    anthropic: { vision: true, documents: true, fileUpload: false },
    openai: { vision: true, documents: false, fileUpload: false },
    gemini: { vision: true, documents: true, fileUpload: true },
    'gemini-cli': { vision: true, documents: true, fileUpload: true },
    'google-gemini-cli': { vision: true, documents: true, fileUpload: true },
    codex: { vision: true, documents: false, fileUpload: false },
    'openai-codex': { vision: true, documents: false, fileUpload: false },
    grok: { vision: true, documents: false, fileUpload: false },
    deepseek: { vision: false, documents: false, fileUpload: false },
    perplexity: { vision: true, documents: false, fileUpload: false },
    openrouter: { vision: true, documents: false, fileUpload: false }, // varies
    ollama: { vision: false, documents: false, fileUpload: false }, // varies
};

const FALLBACK: ModelCapabilities = { vision: false, documents: false, fileUpload: false };

/**
 * Get the capabilities for a specific model + provider combo.
 * Model-level overrides take precedence over provider defaults.
 */
export function getModelCapabilities(modelId: string, providerId: string): ModelCapabilities {
    const providerDefaults = PROVIDER_DEFAULTS[providerId] ?? FALLBACK;
    const overrides = MODEL_OVERRIDES[modelId];
    if (overrides) {
        return { ...providerDefaults, ...overrides };
    }
    return providerDefaults;
}

// ── Attachment classification ──

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg']);
const DOCUMENT_EXTENSIONS = new Set(['pdf', 'docx', 'xlsx', 'pptx', 'doc', 'xls', 'csv', 'txt', 'md', 'rtf']);

export type AttachmentCategory = 'image' | 'document' | 'unknown';

export function classifyFile(filename: string): AttachmentCategory {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    if (IMAGE_EXTENSIONS.has(ext)) return 'image';
    if (DOCUMENT_EXTENSIONS.has(ext)) return 'document';
    return 'unknown';
}

export function isImageFile(filename: string): boolean {
    return classifyFile(filename) === 'image';
}

// ── Validation ──

export interface ValidationResult {
    valid: boolean;
    error?: string;
}

/**
 * Validate that the selected model can handle the given attachments.
 * Returns { valid: true } or { valid: false, error: '...' }.
 */
export function validateAttachments(
    modelId: string,
    providerId: string,
    filenames: string[]
): ValidationResult {
    if (filenames.length === 0) return { valid: true };

    const caps = getModelCapabilities(modelId, providerId);
    const categories = filenames.map(f => classifyFile(f));

    const hasImages = categories.includes('image');
    const hasDocs = categories.includes('document');

    // OpenRouter / Ollama — allow with a caveat (handled by UI as a warning)
    if (providerId === 'openrouter' || providerId === 'ollama') {
        return { valid: true };
    }

    if (hasImages && !caps.vision) {
        return {
            valid: false,
            error: `${modelId} does not support vision, so images cannot be sent with this message.`
        };
    }

    if (hasDocs && !caps.documents) {
        return {
            valid: false,
            error: `${modelId} does not support document processing, so file attachments like .docx/.pdf cannot be sent with this message.`
        };
    }

    return { valid: true };
}

// Max limits
export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;       // 20 MB per file
export const MAX_TOTAL_SIZE_BYTES = 50 * 1024 * 1024;      // 50 MB total per message
