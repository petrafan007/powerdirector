import { TelegramChannel } from '../../../src/channels/telegram';
import { WhatsAppChannel } from '../../../src/channels/whatsapp';
import { SlackChannel } from '../../../src/channels/slack';
import { DiscordChannel } from '../../../src/channels/discord';
import { EmailChannel } from '../../../src/channels/email';
import { SignalChannel } from '../../../src/channels/signal';
import { TeamsChannel } from '../../../src/channels/teams';
import { MatrixChannel } from '../../../src/channels/matrix';
import { NextcloudTalkChannel } from '../../../src/channels/nextcloud-talk';
import { WebChatChannel } from '../../../src/channels/webchat';
import { BlueBubblesChannel } from '../../../src/channels/bluebubbles';
import { IMessageChannel, type IMessageService } from '../../../src/channels/imessage';
import { NostrChannel } from '../../../src/channels/nostr';
import { GoogleChatChannel } from '../../../src/channels/google-chat';
import { TwitchChannel } from '../../../src/channels/twitch';
import { LineChannel } from '../../../src/channels/line';
import { TlonChannel } from '../../../src/channels/tlon';
import { ZaloChannel } from '../../../src/channels/zalo';
import { ZaloUserChannel } from '../../../src/channels/zalouser';

export interface ChannelInitializationOptions {
    env: any;
    config: any;
    authFor: (key: string) => string | undefined;
    pickString: (...values: Array<string | undefined | null>) => string | undefined;
    resolveChannelRuntimeConfig: (key: string) => any;
    isChannelEnabled: (config: any, envDefault: boolean) => boolean;
    envBool: (val: string | undefined) => boolean | undefined;
    envPositiveNumber: (val: string | undefined) => number | undefined;
}

export function initializeChannels(gateway: any, options: ChannelInitializationOptions) {
    const {
        env,
        config,
        authFor,
        pickString,
        resolveChannelRuntimeConfig,
        isChannelEnabled,
        envBool,
        envPositiveNumber
    } = options;

    const registerChannel = (policyKey: string, channel: any) => {
        gateway.registerChannel(channel, policyKey);
    };

    // Register Channels
    const telegramCfg = resolveChannelRuntimeConfig('telegram').effective;
    const telegramToken = pickString(authFor('telegram'), telegramCfg.botToken, telegramCfg.token, env.TELEGRAM_TOKEN);
    if (telegramToken && isChannelEnabled(telegramCfg, true)) {
        registerChannel('telegram', new TelegramChannel({
            ...telegramCfg,
            botToken: telegramToken
        }));
    }

    const whatsappCfg = resolveChannelRuntimeConfig('whatsapp').effective;
    if (isChannelEnabled(whatsappCfg, envBool(env.WHATSAPP_ENABLED) === true)) {
        try {
            registerChannel('whatsapp', new WhatsAppChannel());
        } catch (e) {
            console.error('Failed to register WhatsApp channel', e);
        }
    }

    const slackCfg = resolveChannelRuntimeConfig('slack').effective;
    const slackToken = pickString(authFor('slack'), slackCfg.botToken, slackCfg.token, env.SLACK_BOT_TOKEN);
    const slackAppToken = pickString(authFor('slackapp'), slackCfg.appToken, slackCfg.apiKey, env.SLACK_APP_TOKEN);
    if (slackToken && slackAppToken && isChannelEnabled(slackCfg, true)) {
        try {
            registerChannel('slack', new SlackChannel(slackToken, slackAppToken));
        } catch (e) {
            console.error('Failed to register Slack channel', e);
        }
    }

    const discordCfg = resolveChannelRuntimeConfig('discord').effective;
    const discordToken = pickString(authFor('discord'), discordCfg.botToken, discordCfg.token, env.DISCORD_TOKEN);
    if (discordToken && isChannelEnabled(discordCfg, true)) {
        try {
            registerChannel('discord', new DiscordChannel(discordToken));
        } catch (e) {
            console.error('Failed to register Discord channel', e);
        }
    }

    const emailCfg = resolveChannelRuntimeConfig('email').effective;
    const emailUser = pickString(emailCfg.imapUser, emailCfg.smtpUser, env.EMAIL_USER, env.GMAIL_USER);
    const emailPass = pickString(authFor('email'), emailCfg.imapPass, emailCfg.smtpPass, env.EMAIL_PASSWORD, env.GMAIL_APP_PASSWORD);
    if (emailUser && emailPass && isChannelEnabled(emailCfg, true)) {
        try {
            registerChannel('email', new EmailChannel({
                user: emailUser,
                pass: emailPass,
                imapHost: pickString(emailCfg.imapHost, env.IMAP_HOST),
                imapPort: emailCfg.imapPort || (env.IMAP_PORT ? parseInt(env.IMAP_PORT, 10) : undefined),
                smtpHost: pickString(emailCfg.smtpHost, env.SMTP_HOST),
                smtpPort: emailCfg.smtpPort || (env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : undefined),
            }));
        } catch (e) {
            console.error('Failed to register Email channel', e);
        }
    }

    const signalCfg = resolveChannelRuntimeConfig('signal').effective;
    const signalPhone = pickString(signalCfg.account, signalCfg.phone, env.SIGNAL_PHONE);
    if (signalPhone && isChannelEnabled(signalCfg, true)) {
        try {
            registerChannel('signal', new SignalChannel(signalPhone));
        } catch (e) {
            console.error('Failed to register Signal channel', e);
        }
    }

    const teamsCfg = resolveChannelRuntimeConfig('msteams').effective;
    const teamsAppId = pickString(teamsCfg.appId, env.TEAMS_APP_ID);
    const teamsAppPassword = pickString(authFor('msteams'), authFor('teams'), teamsCfg.appPassword, env.TEAMS_APP_PASSWORD);
    if (teamsAppId && teamsAppPassword && isChannelEnabled(teamsCfg, true)) {
        try {
            registerChannel('msteams', new TeamsChannel(teamsAppId, teamsAppPassword));
        } catch (e) {
            console.error('Failed to register Teams channel', e);
        }
    }

    const matrixCfg = resolveChannelRuntimeConfig('matrix').effective;
    const matrixBaseUrl = pickString(matrixCfg.homeserverUrl, matrixCfg.url, env.MATRIX_BASE_URL);
    const matrixAccessToken = pickString(authFor('matrix'), matrixCfg.accessToken, matrixCfg.token, env.MATRIX_ACCESS_TOKEN);
    const matrixUserId = pickString(matrixCfg.userId, env.MATRIX_USER_ID);
    if (matrixBaseUrl && matrixAccessToken && matrixUserId && isChannelEnabled(matrixCfg, true)) {
        try {
            registerChannel('matrix', new MatrixChannel(matrixBaseUrl, matrixAccessToken, matrixUserId));
        } catch (e) {
            console.error('Failed to register Matrix channel', e);
        }
    }

    const nextcloudCfg = resolveChannelRuntimeConfig('nextcloudTalk').effective;
    const nextcloudUrl = pickString(nextcloudCfg.url, env.NEXTCLOUD_URL);
    const nextcloudUser = pickString(nextcloudCfg.user, env.NEXTCLOUD_USER);
    const nextcloudPassword = pickString(authFor('nextcloudtalk'), nextcloudCfg.password, env.NEXTCLOUD_PASSWORD);
    if (nextcloudUrl && nextcloudUser && nextcloudPassword && isChannelEnabled(nextcloudCfg, true)) {
        try {
            registerChannel('nextcloudTalk', new NextcloudTalkChannel(nextcloudUrl, nextcloudUser, nextcloudPassword));
        } catch (e) {
            console.error('Failed to register Nextcloud Talk channel', e);
        }
    }

    const webchatCfg = resolveChannelRuntimeConfig('webchat').effective;
    const webChatPort = webchatCfg.port || (env.WEBCHAT_PORT ? parseInt(env.WEBCHAT_PORT, 10) : 3100);
    if (isChannelEnabled(webchatCfg, envBool(env.WEBCHAT_ENABLED) ?? true)) {
        try {
            registerChannel('webchat', new WebChatChannel(webChatPort));
        } catch (e) {
            console.error('Failed to register WebChat channel', e);
        }
    }

    const blueBubblesCfg = resolveChannelRuntimeConfig('bluebubbles').effective;
    const blueBubblesUrl = pickString(blueBubblesCfg.serverUrl, blueBubblesCfg.url, env.BLUEBUBBLES_URL);
    const blueBubblesPassword = pickString(authFor('bluebubbles'), blueBubblesCfg.password, env.BLUEBUBBLES_PASSWORD);
    if (blueBubblesUrl && blueBubblesPassword && isChannelEnabled(blueBubblesCfg, true)) {
        try {
            registerChannel('bluebubbles', new BlueBubblesChannel(blueBubblesUrl, blueBubblesPassword));
        } catch (e) {
            console.error('Failed to register BlueBubbles channel', e);
        }
    }

    const imessageCfg = resolveChannelRuntimeConfig('imessage').effective;
    const imessageEnabled = isChannelEnabled(imessageCfg, envBool(env.IMESSAGE_ENABLED) ?? false);
    const looksLikeLegacyBlueBubblesConfig = Boolean(
        pickString(imessageCfg.url) && pickString(imessageCfg.password)
    ) && !pickString(imessageCfg.cliPath, imessageCfg.dbPath);
    const imessageServiceRaw = pickString(imessageCfg.service, env.IMESSAGE_SERVICE)?.toLowerCase();
    const imessageService: IMessageService = (
        imessageServiceRaw === 'imessage'
        || imessageServiceRaw === 'sms'
        || imessageServiceRaw === 'auto'
    )
        ? imessageServiceRaw
        : 'auto';
    if (imessageEnabled && !looksLikeLegacyBlueBubblesConfig) {
        const imessageIncludeAttachments = typeof imessageCfg.includeAttachments === 'boolean'
            ? imessageCfg.includeAttachments
            : envBool(env.IMESSAGE_INCLUDE_ATTACHMENTS) ?? false;
        const probeTimeoutMs = (
            typeof imessageCfg.probeTimeoutMs === 'number' && Number.isFinite(imessageCfg.probeTimeoutMs)
        )
            ? imessageCfg.probeTimeoutMs
            : envPositiveNumber(env.IMESSAGE_PROBE_TIMEOUT_MS);
        const requestTimeoutMs = (
            typeof imessageCfg.requestTimeoutMs === 'number' && Number.isFinite(imessageCfg.requestTimeoutMs)
        )
            ? imessageCfg.requestTimeoutMs
            : envPositiveNumber(env.IMESSAGE_REQUEST_TIMEOUT_MS);
        try {
            registerChannel('imessage', new IMessageChannel({
                cliPath: pickString(imessageCfg.cliPath, env.IMESSAGE_CLI_PATH, env.IMSG_PATH, 'imsg') || 'imsg',
                dbPath: pickString(imessageCfg.dbPath, env.IMESSAGE_DB_PATH, env.IMSG_DB_PATH),
                includeAttachments: imessageIncludeAttachments,
                probeTimeoutMs,
                requestTimeoutMs,
                service: imessageService,
                region: pickString(imessageCfg.region, env.IMESSAGE_REGION, 'US') || 'US'
            }));
        } catch (e) {
            console.error('Failed to register iMessage channel', e);
        }
    }

    const nostrCfg = resolveChannelRuntimeConfig('nostr').effective;
    const nostrPrivateKey = pickString(authFor('nostr'), nostrCfg.privateKey, env.NOSTR_PRIVATE_KEY);
    if (nostrPrivateKey && isChannelEnabled(nostrCfg, true)) {
        try {
            const relays = (pickString((nostrCfg.relays || []).join(','), env.NOSTR_RELAYS) || 'wss://relay.damus.io,wss://nos.lol').split(',');
            registerChannel('nostr', new NostrChannel(nostrPrivateKey, relays));
        } catch (e) {
            console.error('Failed to register Nostr channel', e);
        }
    }

    const googleChatCfg = resolveChannelRuntimeConfig('googlechat').effective;
    const serviceAccountObject = (
        googleChatCfg.serviceAccount
        && typeof googleChatCfg.serviceAccount === 'object'
        && !Array.isArray(googleChatCfg.serviceAccount)
    )
        ? JSON.stringify(googleChatCfg.serviceAccount)
        : undefined;
    const googleChatCredentials = pickString(
        authFor('googlechat'),
        googleChatCfg.credentials,
        typeof googleChatCfg.serviceAccount === 'string' ? googleChatCfg.serviceAccount : undefined,
        serviceAccountObject,
        env.GOOGLE_CHAT_CREDENTIALS
    );
    const googleChatKeyFile = pickString(
        googleChatCfg.credentialsFile,
        googleChatCfg.serviceAccountFile,
        env.GOOGLE_CHAT_KEY_FILE
    );
    const googleChatEnabled = isChannelEnabled(googleChatCfg, envBool(env.GOOGLE_CHAT_ENABLED) ?? false);

    if (googleChatEnabled) {
        try {
            registerChannel('googlechat', new GoogleChatChannel({
                credentials: googleChatCredentials,
                credentialsFile: googleChatKeyFile,
                enabled: true
            }));
        } catch (e) {
            console.error('Failed to register Google Chat channel', e);
        }
    }

    const twitchCfg = resolveChannelRuntimeConfig('twitch').effective;
    const twitchClientId = pickString(authFor('twitch'), twitchCfg.clientId, env.TWITCH_CLIENT_ID);
    const twitchAccessToken = pickString(authFor('twitch'), twitchCfg.accessToken, env.TWITCH_ACCESS_TOKEN);
    const twitchChannels = Array.isArray(twitchCfg.channels) ? twitchCfg.channels : (env.TWITCH_CHANNELS || '').split(',').filter(Boolean);
    if (twitchClientId && twitchAccessToken && twitchChannels.length > 0 && isChannelEnabled(twitchCfg, true)) {
        try {
            registerChannel('twitch', new TwitchChannel({
                clientId: twitchClientId,
                accessToken: twitchAccessToken,
                clientSecret: pickString(twitchCfg.clientSecret, env.TWITCH_CLIENT_SECRET),
                refreshToken: pickString(twitchCfg.refreshToken, env.TWITCH_REFRESH_TOKEN),
                channels: twitchChannels
            }));
        } catch (e) {
            console.error('Failed to register Twitch channel', e);
        }
    }

    const lineCfg = resolveChannelRuntimeConfig('line').effective;
    const lineChannelAccessToken = pickString(authFor('line'), lineCfg.channelAccessToken, env.LINE_CHANNEL_ACCESS_TOKEN);
    const lineChannelSecret = pickString(authFor('linesecret'), lineCfg.channelSecret, env.LINE_CHANNEL_SECRET);
    if (lineChannelAccessToken && lineChannelSecret && isChannelEnabled(lineCfg, true)) {
        try {
            registerChannel('line', new LineChannel({
                channelAccessToken: lineChannelAccessToken,
                channelSecret: lineChannelSecret
            }));
        } catch (e) {
            console.error('Failed to register Line channel', e);
        }
    }

    const tlonCfg = resolveChannelRuntimeConfig('tlon').effective;
    const tlonShip = pickString(tlonCfg.ship, env.TLON_SHIP);
    const tlonUrl = pickString(tlonCfg.url, env.TLON_URL);
    const tlonCode = pickString(authFor('tlon'), tlonCfg.code, env.TLON_CODE);
    if (tlonShip && tlonUrl && tlonCode && isChannelEnabled(tlonCfg, true)) {
        try {
            registerChannel('tlon', new TlonChannel({
                ship: tlonShip,
                url: tlonUrl,
                code: tlonCode,
                allowPrivateNetwork: tlonCfg.allowPrivateNetwork,
                groupChannels: tlonCfg.groupChannels,
                dmAllowlist: tlonCfg.dmAllowlist,
                autoDiscoverChannels: tlonCfg.autoDiscoverChannels,
                showModelSignature: tlonCfg.showModelSignature
            }));
        } catch (e) {
            console.error('Failed to register Tlon channel', e);
        }
    }

    const zaloCfg = resolveChannelRuntimeConfig('zalo').effective;
    const zaloBotToken = pickString(authFor('zalo'), zaloCfg.botToken, env.ZALO_BOT_TOKEN);
    if (zaloBotToken && isChannelEnabled(zaloCfg, true)) {
        try {
            registerChannel('zalo', new ZaloChannel({
                botToken: zaloBotToken,
                dmPolicy: zaloCfg.dmPolicy,
                allowFrom: zaloCfg.allowFrom
            }));
        } catch (e) {
            console.error('Failed to register Zalo channel', e);
        }
    }

    const zaloUserCfg = resolveChannelRuntimeConfig('zalouser').effective;
    if (isChannelEnabled(zaloUserCfg, true)) {
        try {
            registerChannel('zalouser', new ZaloUserChannel({
                profile: zaloUserCfg.profile,
                dmPolicy: zaloUserCfg.dmPolicy,
                allowFrom: zaloUserCfg.allowFrom,
                groupPolicy: zaloUserCfg.groupPolicy,
                groups: zaloUserCfg.groups
            }));
        } catch (e) {
            console.error('Failed to register Zalo User channel', e);
        }
    }
}
