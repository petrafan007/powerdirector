import { CircuitBreaker, CircuitState } from '../src/reliability/circuit-breaker';
import { PowerDirectorError } from '../src/reliability/errors';

async function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    console.log('Testing Circuit Breaker...');
    const cb = new CircuitBreaker({ failureThreshold: 2, resetTimeoutMs: 100 });

    // 1. Success case
    await cb.execute(async () => 'success');
    console.log('Test 1 Passed: Normal execution');

    // 2. Failure threshold
    try { await cb.execute(async () => { throw new Error('fail 1'); }); } catch { }
    try { await cb.execute(async () => { throw new Error('fail 2'); }); } catch { }

    if ((cb.state as CircuitState) !== CircuitState.OPEN) {
        throw new Error(`Expected OPEN state, got ${cb.state}`);
    }
    console.log('Test 2 Passed: Circuit Opened on errors');

    // 3. Fail fast
    try {
        await cb.execute(async () => 'should not run');
        throw new Error('Should have thrown CIRCUIT_OPEN');
    } catch (e) {
        if (e instanceof PowerDirectorError && e.code === 'CIRCUIT_OPEN') {
            console.log('Test 3 Passed: Fail fast respected');
        } else {
            throw e;
        }
    }

    // 4. Recovery
    await wait(150); // Wait for reset timeout
    // Next call should succeed and close circuit
    await cb.execute(async () => 'recovery success');

    if ((cb.state as CircuitState) !== CircuitState.CLOSED) {
        throw new Error(`Expected CLOSED state after recovery, got ${cb.state}`);
    }
    console.log('Test 4 Passed: Recovery successful');
}

runTest().catch(console.error);
