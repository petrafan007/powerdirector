import assert from 'node:assert';
import {
    isToolIterationMessage,
    shouldClearThinkingIndicator,
    type ChatMessageLike
} from '../ui/lib/chat-loading';

function runTest() {
    const assistantToolStart: ChatMessageLike = {
        role: 'assistant',
        content: '```json {"tool":"bash","args":{"cmd":"echo hi"}} ```',
        metadata: { callId: 'abc123', status: 'running' }
    };
    assert.strictEqual(isToolIterationMessage(assistantToolStart), true);
    assert.strictEqual(shouldClearThinkingIndicator(assistantToolStart), false);

    const toolOutputChunk: ChatMessageLike = {
        role: 'assistant',
        content: 'chunk output',
        metadata: { callId: 'abc123', type: 'output' }
    };
    assert.strictEqual(isToolIterationMessage(toolOutputChunk), true);
    assert.strictEqual(shouldClearThinkingIndicator(toolOutputChunk), false);

    const toolResultBridgeMessage: ChatMessageLike = {
        role: 'user',
        content: '[Tool Output for bash]:\nhi',
        metadata: { callId: 'abc123', status: 'completed' }
    };
    assert.strictEqual(isToolIterationMessage(toolResultBridgeMessage), true);
    assert.strictEqual(shouldClearThinkingIndicator(toolResultBridgeMessage), false);

    const finalAssistantReply: ChatMessageLike = {
        role: 'assistant',
        content: 'Done. Command finished successfully.'
    };
    assert.strictEqual(isToolIterationMessage(finalAssistantReply), false);
    assert.strictEqual(shouldClearThinkingIndicator(finalAssistantReply), true);

    console.log(JSON.stringify({
        keepsThinkingDuringToolIteration: true,
        clearsThinkingOnFinalAssistantReply: true
    }, null, 2));
}

runTest();
