import { NextRequest } from 'next/server';
import { getConfigManager } from './config-instance';

export function readNodeToken(req: NextRequest): string {
    const authHeader = req.headers.get('authorization') || '';
    const bearer = authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : '';
    const headerToken = (req.headers.get('x-node-token') || '').trim();
    return bearer || headerToken;
}

export function resolveExpectedNodeToken(): string {
    const nodeHostConfig = getConfigManager().getSection('nodeHost', false) as any;
    const fromConfig = typeof nodeHostConfig?.authToken === 'string'
        ? nodeHostConfig.authToken.trim()
        : '';
    const fromEnv = typeof process.env.NODE_HOST_TOKEN === 'string'
        ? process.env.NODE_HOST_TOKEN.trim()
        : '';
    return fromConfig || fromEnv;
}

export function authorizeNodeRequest(
    req: NextRequest,
    options?: { statusIfUnauthorized?: number }
): { ok: boolean; error?: string; status?: number } {
    const expectedToken = resolveExpectedNodeToken();
    if (!expectedToken) {
        return { ok: true };
    }

    const providedToken = readNodeToken(req);
    if (providedToken !== expectedToken) {
        return {
            ok: false,
            error: 'Unauthorized node token.',
            status: options?.statusIfUnauthorized || 401
        };
    }

    return { ok: true };
}
