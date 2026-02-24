import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getService } from '../../../../lib/agent-instance';
import { resolvePowerDirectorRoot } from '../../../../lib/paths';

function normalizeChannelId(raw: unknown): string | undefined {
    if (typeof raw !== 'string') return undefined;
    const trimmed = raw.trim();
    const lowered = trimmed.toLowerCase();
    if (!lowered) return undefined;
    if (lowered === 'teams' || lowered === 'msteams') return 'msteams';
    if (lowered === 'googlechat' || lowered === 'google-chat' || lowered === 'gchat') return 'googlechat';
    return trimmed;
}

export async function POST(req: Request) {
    // Ensure service (and Gateway) is initialized
    getService();

    let gatewayPort = 3012;
    let gatewayToken = '';

    try {
        const rootDir = resolvePowerDirectorRoot();
        const configPath = path.join(rootDir, 'powerdirector.config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            gatewayPort = config.gateway?.port || 3012;
            gatewayToken = config.gateway?.auth?.token || '';
        }
    } catch (err) {
        console.warn('Failed to read config for gateway port/token', err);
    }

    try {
        const body = await req.json();
        const normalizedChannelId = normalizeChannelId(body?.channelId) || normalizeChannelId(body?.channel);
        const payload = {
            ...body,
            ...(normalizedChannelId ? { channelId: normalizedChannelId, channel: normalizedChannelId } : {})
        };

        // Forward to Gateway Control Server
        const res = await fetch(`http://127.0.0.1:${gatewayPort}/channels/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${gatewayToken}`
            },
            body: JSON.stringify(payload)
        });

        const bodyText = await res.text();

        if (!res.ok) {
            console.warn(`Gateway logout returned ${res.status}: ${bodyText.slice(0, 100)}`);
            throw new Error(`Gateway returned ${res.status}: ${bodyText}`);
        }

        const data = JSON.parse(bodyText);
        return NextResponse.json(data);
    } catch (e: any) {
        console.error('Failed to logout channel via Gateway', e.message);
        return NextResponse.json({
            error: e.message || "Gateway unreachable"
        }, { status: 502 });
    }
}
