// @ts-nocheck
export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface MediaPart {
    type: 'image' | 'file';
    mimeType: string;
    data: string; // base64
    sizeBytes: number;
}

export interface TextPart {
    type: 'text';
    text: string;
}

export type ContentPart = TextPart | MediaPart;

export interface Message {
    id?: number;
    role: Role;
    content: string | ContentPart[];
    timestamp: number;
    tokenCount?: number; // Estimated
    metadata?: Record<string, any>;
}

export interface ContextBudget {
    maxTokens: number;
    maxImagesPerTurn: number;
    maxTotalImages: number;
    retainSystemPrompt: boolean;
}
