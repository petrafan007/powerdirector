import { BudgetManager } from '../src/context/budget';
import { ContextPruner } from '../src/context/pruner';
import { ContextBudget, Message } from '../src/context/types';

const config: ContextBudget = {
    maxTokens: 100, // Very low for testing
    maxImagesPerTurn: 2,
    maxTotalImages: 2,
    retainSystemPrompt: true
};

const budgetManager = new BudgetManager(config);
const pruner = new ContextPruner(budgetManager, config);

function createMsg(role: 'user' | 'assistant', text: string, images = 0): Message {
    const content = [{ type: 'text', text }] as any[];
    for (let i = 0; i < images; i++) {
        content.push({ type: 'image', mimeType: 'image/png', data: '...', sizeBytes: 100 });
    }
    return {
        role,
        content,
        timestamp: Date.now()
    };
}

async function runTest() {
    console.log('Testing Context Pruner...');

    // 1. Test Media Pruning
    const heavyHistory: Message[] = [
        createMsg('user', 'Old message', 2),
        createMsg('assistant', 'Old response', 1),
        createMsg('user', 'New message', 1)
    ];
    // Total images: 4. Max: 2.
    // Should prune images from oldest (index 0), then index 1.
    // Index 0 has 2 images -> removed. Total becomes 2. Validation passes.

    // Note: The logic in pruner modifies messages in place if not careful with deep copies.
    // My implementation did shallow copy of array but objects are ref.
    // This is fine for this test, but in prod we might want deep copy or immutable structures.

    console.log('Original Images:', heavyHistory.map(m => (m.content as any[]).filter((p: any) => p.type === 'image').length));

    const prunedMedia = pruner.prune(heavyHistory);

    const finalImageCounts = prunedMedia.map(m => (m.content as any[]).filter((p: any) => p.type === 'image').length);
    console.log('Pruned Images:', finalImageCounts);

    if (finalImageCounts[0] !== 0) throw new Error('Failed to prune old images');
    if (finalImageCounts[2] !== 1) throw new Error('Pruned new images incorrectly');

    console.log('Test 1 Passed: Media Pruning');

    // 2. Test Token Pruning (Simple FIFO)
    const longHistory: Message[] = [
        { role: 'system', content: 'You are a helpful assistant.', timestamp: 0 },
        createMsg('user', 'A very long message that definitely exceeds the token limit of 100 tokens. '.repeat(5)),
        createMsg('assistant', 'Short response'),
        createMsg('user', 'Current message')
    ];

    const prunedTokens = pruner.prune(longHistory);
    console.log('Pruned History Length:', prunedTokens.length);
    console.log('Roles:', prunedTokens.map(m => m.role));

    if (prunedTokens[0].role !== 'system') throw new Error('System prompt lost');
    if (prunedTokens.length >= 4) throw new Error('Did not prune long history');

    console.log('Test 2 Passed: Token Pruning');
}

runTest().catch((err) => {
    console.error(err);
    process.exit(1);
});
