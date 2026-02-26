import assert from 'node:assert';
import {
    createQueuedMessage,
    removeQueuedMessageById,
    type QueuedMessage
} from '../ui/lib/chat-queue';

function runTest() {
    const blank = createQueuedMessage('   ');
    assert.strictEqual(blank, null, 'blank messages should not queue');

    const first = createQueuedMessage('  test one  ');
    const second = createQueuedMessage('test two');
    assert.ok(first, 'first queued item should be created');
    assert.ok(second, 'second queued item should be created');
    assert.strictEqual(first!.text, 'test one', 'queued text should be trimmed');
    assert.strictEqual(second!.text, 'test two', 'queued text should be preserved');
    assert.ok(first!.id.length > 0, 'queued item id should exist');
    assert.ok(typeof first!.createdAt === 'number', 'queued item timestamp should exist');

    const queue: QueuedMessage[] = [first!, second!];
    const afterRemoveFirst = removeQueuedMessageById(queue, first!.id);
    assert.strictEqual(afterRemoveFirst.length, 1, 'removing one queued item should shrink queue');
    assert.strictEqual(afterRemoveFirst[0].id, second!.id, 'remaining queued item should be second');

    const afterRemoveUnknown = removeQueuedMessageById(queue, 'missing-id');
    assert.strictEqual(afterRemoveUnknown.length, 2, 'removing unknown id should be a no-op');

    console.log(JSON.stringify({
        rejectsBlankQueueItems: true,
        keepsTrimmedMessageText: true,
        supportsQueueItemRemovalById: true
    }, null, 2));
}

runTest();
