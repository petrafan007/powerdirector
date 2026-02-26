import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { WebSocket } from 'ws';
import { TerminalManager } from '../src/core/terminal';

async function connect(url: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url);

        const onOpen = () => {
            cleanup();
            resolve(ws);
        };

        const onError = (error: Error) => {
            cleanup();
            reject(error);
        };

        const cleanup = () => {
            ws.off('open', onOpen);
            ws.off('error', onError);
        };

        ws.on('open', onOpen);
        ws.on('error', onError);
    });
}

async function waitForText(ws: WebSocket, needle: string, timeoutMs: number = 15000): Promise<string> {
    return new Promise((resolve, reject) => {
        let buffer = '';

        const timer = setTimeout(() => {
            cleanup();
            reject(new Error(`Timed out waiting for "${needle}". Received so far: ${JSON.stringify(buffer.slice(-300))}`));
        }, timeoutMs);

        const onMessage = (raw: Buffer | ArrayBuffer | Buffer[]) => {
            const chunk = Array.isArray(raw)
                ? Buffer.concat(raw).toString('utf8')
                : Buffer.isBuffer(raw)
                    ? raw.toString('utf8')
                    : Buffer.from(raw).toString('utf8');
            buffer += chunk;
            if (buffer.includes(needle)) {
                cleanup();
                resolve(buffer);
            }
        };

        const onError = (error: Error) => {
            cleanup();
            reject(error);
        };

        const onClose = () => {
            cleanup();
            reject(new Error(`Socket closed before receiving "${needle}".`));
        };

        const cleanup = () => {
            clearTimeout(timer);
            ws.off('message', onMessage);
            ws.off('error', onError);
            ws.off('close', onClose);
        };

        ws.on('message', onMessage);
        ws.on('error', onError);
        ws.on('close', onClose);
    });
}

async function closeSocket(ws: WebSocket): Promise<void> {
    if (ws.readyState === WebSocket.CLOSED) return;
    await new Promise<void>((resolve) => {
        ws.once('close', () => resolve());
        ws.close(1000, 'test-complete');
    });
}

async function run(): Promise<void> {
    const port = 38100 + Math.floor(Math.random() * 1000);
    const manager = new TerminalManager(port, () => ({
        shell: 'zsh',
        autoTimeoutMinutes: 10,
        port
    }));

    await manager.start();

    const sessionId = `terminal-${randomUUID()}`;
    const marker = `PD_RECONNECT_${Date.now()}`;
    const wsUrl = `ws://127.0.0.1:${port}/?sessionId=${encodeURIComponent(sessionId)}&shell=zsh&autoTimeoutMinutes=10`;

    let ws1: WebSocket | null = null;
    let ws2: WebSocket | null = null;

    try {
        ws1 = await connect(wsUrl);
        await delay(150);

        ws1.send(`export PD_RECONNECT_TEST=${marker}\r`);
        await delay(120);
        ws1.send('echo $PD_RECONNECT_TEST\r');
        const firstOutput = await waitForText(ws1, marker, 15000);
        assert.ok(firstOutput.includes(marker), 'initial terminal did not retain exported variable');

        await closeSocket(ws1);
        ws1 = null;

        await delay(150);

        ws2 = await connect(wsUrl);
        await delay(100);
        ws2.send('echo $PD_RECONNECT_TEST\r');
        const secondOutput = await waitForText(ws2, marker, 15000);
        assert.ok(secondOutput.includes(marker), 'reconnected terminal did not retain prior shell state');

        const closed = manager.closeSession(sessionId);
        assert.strictEqual(closed, true, 'closeSession should close an existing terminal session');

        console.log(JSON.stringify({
            preservesStateAcrossReconnect: true,
            closeSessionApiClosesSession: true
        }, null, 2));
    } finally {
        if (ws1) {
            try {
                await closeSocket(ws1);
            } catch {
                // Ignore cleanup errors.
            }
        }
        if (ws2) {
            try {
                await closeSocket(ws2);
            } catch {
                // Ignore cleanup errors.
            }
        }
        manager.stop();
    }
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
