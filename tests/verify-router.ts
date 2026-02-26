import { ProviderRouter, Provider } from '../src/reliability/router';
import { CircuitBreaker } from '../src/reliability/circuit-breaker';
import { PowerDirectorError, ErrorCode } from '../src/reliability/errors';

async function runTest() {
    console.log('Testing Provider Router...');
    const router = new ProviderRouter();

    // Mock Providers
    const providerA: Provider = {
        config: { name: 'ProviderA', apiEndpoint: 'a', timeoutMs: 1000 },
        circuit: new CircuitBreaker(),
        completion: async (p) => {
            throw new Error('ProviderA timeout');
        }
    };

    const providerB: Provider = {
        config: { name: 'ProviderB', apiEndpoint: 'b', timeoutMs: 1000 },
        circuit: new CircuitBreaker(),
        completion: async (p) => {
            return `Response from B for: ${p}`;
        }
    };

    router.addProvider(providerA);
    router.addProvider(providerB);

    // Test Fallback
    const result = await router.execute('Hello');
    console.log('Result:', result);

    if (result !== 'Response from B for: Hello') {
        throw new Error('Fallback failed');
    }
    console.log('Test 1 Passed: Fallback success');

    // Test Circuit Open skips

    // Force Provider A circuit open
    try { await providerA.circuit.execute(async () => { throw new Error('force fail'); }); } catch { }
    try { await providerA.circuit.execute(async () => { throw new Error('force fail'); }); } catch { }
    try { await providerA.circuit.execute(async () => { throw new Error('force fail'); }); } catch { }

    console.log('Provider A Circuit State:', providerA.circuit.state);

    const start = Date.now();
    const res2 = await router.execute('Fast Fail?');
    const duration = Date.now() - start;

    if (res2 !== 'Response from B for: Fast Fail?') {
        throw new Error('Fallback failed with open circuit');
    }

    // If circuit is open, router should skip/fail fast on A. 
    // Router.executeWithRetry checks circuit.execute which throws immediately if open.
    // Then router catches and moves to B.
    console.log('Test 2 Passed: Circuit Open handling');
}

runTest().catch((err) => {
    console.error(err);
    process.exit(1);
});
