// @ts-nocheck
import { Tool, ToolResult } from './base.js';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
// import { record } from 'node-record-lpcm16'; // For capturing - optional future expansion

interface AudioTtsConfig {
    enabled?: boolean;
    provider?: 'elevenlabs' | 'openai' | 'google';
    model?: string;
    voice?: string;
    speed?: number;
}

interface AudioSttConfig {
    enabled?: boolean;
    provider?: 'whisper' | 'google' | 'deepgram';
    model?: string;
    language?: string;
}

interface VoiceToolOptions {
    tts?: AudioTtsConfig;
    stt?: AudioSttConfig;
    outputDir?: string;
}

export class VoiceTool implements Tool {
    public name = 'voice';
    public description = 'Speech-to-Text (STT) and Text-to-Speech (TTS). Actions: speak, transcribe.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['speak', 'transcribe'] },
            text: { type: 'string', description: 'Text to speak (for speak)' },
            audioFile: { type: 'string', description: 'Path to audio file (for transcribe)' },
            voice: { type: 'string', enum: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'], default: 'alloy' },
            speed: { type: 'number', description: 'Speech speed multiplier (0.5-2.0)' },
            model: { type: 'string', description: 'Provider model override' },
            language: { type: 'string', description: 'Language code for transcription' }
        },
        required: ['action']
    };

    private client: OpenAI;
    private readonly tts: Required<AudioTtsConfig>;
    private readonly stt: Required<AudioSttConfig>;
    private readonly outputDir: string;

    constructor(apiKey: string, options: VoiceToolOptions = {}) {
        this.client = new OpenAI({ apiKey });
        this.tts = {
            enabled: options.tts?.enabled ?? false,
            provider: options.tts?.provider || 'openai',
            model: options.tts?.model || 'tts-1-hd',
            voice: options.tts?.voice || 'alloy',
            speed: typeof options.tts?.speed === 'number' && Number.isFinite(options.tts.speed)
                ? Math.max(0.5, Math.min(2.0, options.tts.speed))
                : 1.0
        };
        this.stt = {
            enabled: options.stt?.enabled ?? false,
            provider: options.stt?.provider || 'whisper',
            model: options.stt?.model || 'whisper-1',
            language: options.stt?.language || 'en'
        };
        this.outputDir = options.outputDir || process.cwd();
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    async execute(args: any): Promise<ToolResult> {
        try {
            switch (args.action) {
                case 'speak':
                    if (!this.tts.enabled) return { output: 'TTS is disabled by settings.', isError: true };
                    if (!args.text) return { output: 'Text required', isError: true };
                    if (this.tts.provider !== 'openai') {
                        return { output: `TTS provider "${this.tts.provider}" is not supported in this build.`, isError: true };
                    }

                    const speechFile = path.resolve(this.outputDir, `speech-${Date.now()}.mp3`);
                    const speed = typeof args.speed === 'number' && Number.isFinite(args.speed)
                        ? Math.max(0.5, Math.min(2.0, args.speed))
                        : this.tts.speed;
                    const mp3 = await this.client.audio.speech.create({
                        model: args.model || this.tts.model,
                        voice: args.voice || this.tts.voice,
                        input: args.text,
                        speed
                    });

                    const buffer = Buffer.from(await mp3.arrayBuffer());
                    await fs.promises.writeFile(speechFile, buffer);

                    return { output: `Speech generated: ${speechFile}` };

                case 'transcribe':
                    if (!this.stt.enabled) return { output: 'STT is disabled by settings.', isError: true };
                    if (!args.audioFile) return { output: 'Audio file required', isError: true };
                    if (!['whisper'].includes(this.stt.provider)) {
                        return { output: `STT provider "${this.stt.provider}" is not supported in this build.`, isError: true };
                    }

                    const transcription = await this.client.audio.transcriptions.create({
                        file: fs.createReadStream(args.audioFile),
                        model: args.model || this.stt.model,
                        language: args.language || this.stt.language
                    });

                    return { output: transcription.text };

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Voice Error: ${error.message}`, isError: true };
        }
    }
}
