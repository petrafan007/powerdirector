
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { resolvePowerDirectorRoot } from '../../../../lib/paths';

function normalizeChannelConfigKey(channelId: string): string {
    const raw = String(channelId || '').trim();
    const lowered = raw.toLowerCase();
    if (!lowered) return raw;
    if (lowered === 'teams' || lowered === 'msteams') return 'msteams';
    if (lowered === 'googlechat' || lowered === 'google-chat' || lowered === 'gchat') {
        return 'googlechat';
    }
    if (lowered === 'nextcloud-talk' || lowered === 'nextcloudtalk') {
        return 'nextcloudTalk';
    }
    if (lowered === 'webchat') return 'webchat';
    if (lowered === 'bluebubbles') return 'bluebubbles';
    if (lowered === 'imessage') return 'imessage';
    return raw;
}

function resolveExistingChannelKey(channels: Record<string, any>, requestedId: string): string {
    const normalized = normalizeChannelConfigKey(requestedId);
    const aliases = new Set<string>([
        requestedId,
        normalized,
        requestedId.toLowerCase(),
        normalized.toLowerCase()
    ]);
    for (const key of Object.keys(channels)) {
        const lowered = key.toLowerCase();
        if (aliases.has(key) || aliases.has(lowered)) {
            return key;
        }
    }
    return normalized;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { channelId, config: newConfig } = body;

        if (!channelId || !newConfig) {
            return NextResponse.json({ error: 'Missing channelId or config' }, { status: 400 });
        }

        const rootDir = resolvePowerDirectorRoot();
        const configPath = path.join(rootDir, 'powerdirector.config.json');
        if (!fs.existsSync(configPath)) {
            return NextResponse.json({ error: 'Config file not found' }, { status: 404 });
        }

        const currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        // Update the specific channel config
        if (!currentConfig.channels) currentConfig.channels = {};
        const targetChannelKey = resolveExistingChannelKey(currentConfig.channels, String(channelId));
        currentConfig.channels[targetChannelKey] = {
            ...currentConfig.channels[targetChannelKey],
            ...newConfig
        };

        // Write back to file
        fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2));

        return NextResponse.json({
            success: true,
            channelId: targetChannelKey,
            config: currentConfig.channels[targetChannelKey]
        });
    } catch (error: any) {
        console.error('Failed to update channel config', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
