export interface QueuedMessage {
    id: string;
    text: string;
    createdAt: number;
}

export function createQueuedMessage(text: string): QueuedMessage | null {
    const trimmed = text.trim();
    if (!trimmed) {
        return null;
    }
    const now = Date.now();
    return {
        id: `queue-${now}-${Math.random().toString(36).slice(2, 9)}`,
        text: trimmed,
        createdAt: now
    };
}

export function removeQueuedMessageById(queue: QueuedMessage[], id: string): QueuedMessage[] {
    return queue.filter((item) => item.id !== id);
}
