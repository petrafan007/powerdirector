import { Agent } from '../src/core/agent';
import { SessionManager } from '../src/state/session-manager';
import { DatabaseManager } from '../src/state/db';
import { ProviderRouter, Provider } from '../src/reliability/router';
import { CircuitBreaker } from '../src/reliability/circuit-breaker';
import { ContextPruner } from '../src/context/pruner';
import { BudgetManager } from '../src/context/budget';
import { ToolRegistry } from '../src/tools/base';
import { EchoTool } from '../src/tools/echo';
import fs from 'fs';
import path from 'path';

// Cleanup
const DB_PATH = path.join(process.cwd(), 'powerdirector.db');
if (fs.existsSync(DB_PATH)) {
    try { fs.unlinkSync(DB_PATH); } catch { }
}

async function runTest() {
    console.log('Testing Core Agent Loop...');

    // 1. Setup Dependencies
    const db = new DatabaseManager();
    const sessionManager = new SessionManager(db);

    // Mock Provider that just echoes prompt
    const provider: Provider = {
        config: { name: 'MockProvider', apiEndpoint: 'mock', timeoutMs: 1000 },
        circuit: new CircuitBreaker(),
        completion: async (prompt) => {
            return `[AI Response to: ${prompt.slice(0, 50)}...]`;
        }
    };
    const router = new ProviderRouter();
    router.addProvider(provider);

    const budget = new BudgetManager({
        maxTokens: 1000, maxImagesPerTurn: 5, maxTotalImages: 10, retainSystemPrompt: true
    });
    const pruner = new ContextPruner(budget, {
        maxTokens: 1000, maxImagesPerTurn: 5, maxTotalImages: 10, retainSystemPrompt: true
    });

    const tools = new ToolRegistry();
    tools.register(new EchoTool());

    // 2. Initialize Agent
    const agent = new Agent(sessionManager, router, pruner, tools);

    // 3. Create Session
    const session = sessionManager.createSession('Agent Test');
    console.log(`Session Created: ${session.id}`);

    // 4. Run Loop
    const response = await agent.runStep(session.id, 'Hello Agent');
    console.log('Agent Response:', response);

    if (!response.includes('[AI Response to:')) {
        throw new Error('Agent failed to get response from provider');
    }

    // 5. Verify Persistence
    const history = sessionManager.getSession(session.id);
    if (!history || history.messages.length !== 2) {
        throw new Error('Messages not persisted correctly');
    }
    console.log('Test Passed: Agent Loop & Persistence');
}

runTest().catch((err) => {
    console.error(err);
    process.exit(1);
});
