// @ts-nocheck
import fs from 'node:fs';
import path from 'node:path';
import OpenAI from 'openai';

export interface TalkConfig {
    voiceId?: string;
    voiceAliases?: Record<string, string>;
    modelId?: string;
    outputFormat?: string;
    apiKey?: string;
    interruptOnSpeech?: boolean;
}

interface TalkManagerOptions {
    baseDir?: string;
    speechRunner?: (args: {
        text: string;
        voiceId: string;
        modelId: string;
        outputFormat: string;
        apiKey: string;
    }) => Promise<Buffer>;
}

export interface TalkResult {
    audioPath: string;
    voiceId: string;
    modelId: string;
    outputFormat: string;
}

type OpenAiSpeechFormat = 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm';

const DEFAULT_TALK_MODEL = 'tts-1-hd';
const DEFAULT_TALK_VOICE = 'alloy';
const DEFAULT_TALK_FORMAT: OpenAiSpeechFormat = 'mp3';

export class TalkManager {
    private readonly apiKey: string;
    private readonly voiceId: string;
    private readonly voiceAliases: Record<string, string>;
    private readonly modelId: string;
    private readonly outputFormat: OpenAiSpeechFormat;
    private readonly interruptOnSpeech: boolean;
    private readonly outputDir: string;
    private readonly speechRunner?: (args: {
        text: string;
        voiceId: string;
        modelId: string;
        outputFormat: string;
        apiKey: string;
    }) => Promise<Buffer>;
    private openaiClient: OpenAI | null = null;

    constructor(config: TalkConfig = {}, options: TalkManagerOptions = {}) {
        this.apiKey = typeof config.apiKey === 'string' ? config.apiKey.trim() : '';
        this.voiceId = typeof config.voiceId === 'string' && config.voiceId.trim()
            ? config.voiceId.trim()
            : DEFAULT_TALK_VOICE;
        this.voiceAliases = normalizeVoiceAliases(config.voiceAliases);
        this.modelId = typeof config.modelId === 'string' && config.modelId.trim()
            ? config.modelId.trim()
            : DEFAULT_TALK_MODEL;
        this.outputFormat = normalizeOutputFormat(config.outputFormat);
        this.interruptOnSpeech = config.interruptOnSpeech !== false;
        this.outputDir = path.join(options.baseDir || process.cwd(), 'talk');
        this.speechRunner = options.speechRunner;

        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
        if (this.apiKey) {
            this.openaiClient = new OpenAI({ apiKey: this.apiKey });
        }
    }

    public getStatus(): {
        voiceId: string;
        voiceAliases: Record<string, string>;
        modelId: string;
        outputFormat: string;
        interruptOnSpeech: boolean;
        hasApiKey: boolean;
    } {
        return {
            voiceId: this.voiceId,
            voiceAliases: this.voiceAliases,
            modelId: this.modelId,
            outputFormat: this.outputFormat,
            interruptOnSpeech: this.interruptOnSpeech,
            hasApiKey: this.apiKey.length > 0
        };
    }

    public async speak(text: string, overrides: { voiceId?: string } = {}): Promise<TalkResult> {
        const input = String(text || '').trim();
        if (!input) {
            throw new Error('Talk text is required.');
        }

        if (!this.apiKey) {
            throw new Error('Talk provider requires apiKey.');
        }

        const voiceId = this.resolveVoiceId(overrides.voiceId);

        const buffer = this.speechRunner
            ? await this.speechRunner({
                text: input,
                voiceId,
                modelId: this.modelId,
                outputFormat: this.outputFormat,
                apiKey: this.apiKey
            })
            : await this.runOpenAiSpeech({
                text: input,
                voiceId,
                modelId: this.modelId,
                outputFormat: this.outputFormat
            });

        const extension = this.outputFormat === 'pcm' ? 'pcm' : this.outputFormat;
        const filePath = path.join(this.outputDir, `talk-${Date.now()}.${extension}`);
        await fs.promises.writeFile(filePath, buffer);

        return {
            audioPath: filePath,
            voiceId,
            modelId: this.modelId,
            outputFormat: this.outputFormat
        };
    }

    private resolveVoiceId(overrideVoiceId?: string): string {
        const requested = typeof overrideVoiceId === 'string' ? overrideVoiceId.trim() : '';
        if (!requested) {
            return this.voiceId;
        }
        return this.voiceAliases[requested] || requested;
    }

    private async runOpenAiSpeech(args: {
        text: string;
        voiceId: string;
        modelId: string;
        outputFormat: OpenAiSpeechFormat;
    }): Promise<Buffer> {
        if (!this.openaiClient) {
            this.openaiClient = new OpenAI({ apiKey: this.apiKey });
        }
        const request: any = {
            model: args.modelId,
            voice: args.voiceId,
            input: args.text,
            format: args.outputFormat
        };
        const response = await this.openaiClient.audio.speech.create(request);
        return Buffer.from(await response.arrayBuffer());
    }
}

function normalizeVoiceAliases(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }
    const aliases: Record<string, string> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        if (typeof key !== 'string' || typeof entry !== 'string') {
            continue;
        }
        const trimmedKey = key.trim();
        const trimmedValue = entry.trim();
        if (!trimmedKey || !trimmedValue) {
            continue;
        }
        aliases[trimmedKey] = trimmedValue;
    }
    return aliases;
}

function normalizeOutputFormat(value: unknown): OpenAiSpeechFormat {
    if (typeof value !== 'string' || !value.trim()) {
        return DEFAULT_TALK_FORMAT;
    }
    const normalized = value.trim().toLowerCase();
    if (normalized.startsWith('mp3')) return 'mp3';
    if (normalized.startsWith('opus')) return 'opus';
    if (normalized.startsWith('aac')) return 'aac';
    if (normalized.startsWith('flac')) return 'flac';
    if (normalized.startsWith('wav')) return 'wav';
    if (normalized.startsWith('pcm')) return 'pcm';
    return DEFAULT_TALK_FORMAT;
}
