// @ts-nocheck
import { Message, ContextBudget, ContentPart, MediaPart } from './types.ts';
import { PowerDirectorError, ErrorCode } from '../reliability/errors.ts';

export class BudgetManager {
    constructor(private config: ContextBudget) { }

    public validateTurn(newMessages: Message[]): void {
        // Check per-turn limits
        for (const msg of newMessages) {
            if (Array.isArray(msg.content)) {
                const images = msg.content.filter(p => p.type === 'image' || p.type === 'file') as MediaPart[];
                if (images.length > this.config.maxImagesPerTurn) {
                    throw new PowerDirectorError(
                        `Too many images in single turn. Max: ${this.config.maxImagesPerTurn}, Got: ${images.length}`,
                        ErrorCode.CONTEXT_OVERFLOW,
                        { retryable: false }
                    );
                }
            }
        }
    }

    public estimateTokenCount(text: string): number {
        // Rough estimation: 1 token ~= 4 chars
        return Math.ceil(text.length / 4);
    }

    public checkTotalBudget(history: Message[]): boolean {
        let totalImages = 0;
        let totalTokens = 0;

        for (const msg of history) {
            if (Array.isArray(msg.content)) {
                const images = msg.content.filter(p => p.type === 'image' || p.type === 'file');
                totalImages += images.length;
                // Text parts
                msg.content.forEach(p => {
                    if (p.type === 'text') totalTokens += this.estimateTokenCount(p.text);
                });
            } else {
                totalTokens += this.estimateTokenCount(msg.content as string);
            }
        }

        // This method just returns status, doesn't throw. Pruner uses this.
        return totalImages <= this.config.maxTotalImages && totalTokens <= this.config.maxTokens;
    }
}
