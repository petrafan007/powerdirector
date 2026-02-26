import { ToolRegistry } from '@/src-backend/tools/base';
import { EchoTool } from '@/src-backend/tools/echo';
import { ReadFileTool, WriteFileTool, ReplaceFileTool, ListFilesTool } from '@/src-backend/tools/filesystem';
import { ShellTool } from '@/src-backend/tools/shell';
import { NotionTool } from '@/src-backend/tools/notion';
import { GitHubTool } from '@/src-backend/tools/github';
import { MacProductivityTool } from '@/src-backend/tools/mac-productivity';
import { HomeAssistantTool } from '@/src-backend/tools/home-assistant';
import { SpotifyTool } from '@/src-backend/tools/spotify';
import { BrowserTool } from '@/src-backend/tools/browser';
import { TwitterTool } from '@/src-backend/tools/twitter';
import { RedditTool } from '@/src-backend/tools/reddit';
import { LinkedInTool } from '@/src-backend/tools/linkedin';
import { VoiceTool } from '@/src-backend/tools/voice';
import { SystemTool } from '@/src-backend/tools/system';
import { ImageGenTool } from '@/src-backend/tools/image-gen';
import { WeatherTool } from '@/src-backend/tools/weather';
import { OnePasswordTool } from '@/src-backend/tools/onepassword';
import { GifTool } from '@/src-backend/tools/gif';
import { TrelloTool } from '@/src-backend/tools/trello';
import { ObsidianTool } from '@/src-backend/tools/obsidian';
import { SonosTool } from '@/src-backend/tools/sonos';
import { ShazamTool } from '@/src-backend/tools/shazam';
import { EightSleepTool } from '@/src-backend/tools/eight-sleep';
import { OuraRingTool } from '@/src-backend/tools/oura-ring';
import { BambuTool } from '@/src-backend/tools/bambu';
import { GmailTriggerTool } from '@/src-backend/tools/gmail-triggers';
import { PeekabooTool } from '@/src-backend/tools/peekaboo';
import { Things3Tool } from '@/src-backend/tools/things3';
import { BearNotesTool } from '@/src-backend/tools/bear-notes';
import { TescoTool } from '@/src-backend/tools/tesco';
import { FoodOrderTool } from '@/src-backend/tools/food-order';
import { AndroidTool } from '@/src-backend/tools/android';
import { WindowsTool } from '@/src-backend/tools/windows';
import { WebSearchTool } from '@/src-backend/tools/web-search';
import { WebFetchTool } from '@/src-backend/tools/web-fetch';
import { SubagentsTool } from '@/src-backend/tools/subagent';
import { SkillTool } from '@/src-backend/tools/skill';
import { coerceImageGenModelConfig } from '@/src-backend/tools/image-gen-router';
import { setGlobalSkillsManager } from '@/src-backend/tools/skill-executor';
import { frigateTool } from '@/src-backend/tools/frigate';

export interface ToolInitializationOptions {
    env: any;
    config: any;
    workspaceDir?: string;
    rootDir: string;
    runtimeProcessEnv: any;
    authFor: (key: string) => string | undefined;
    pickString: (...values: Array<string | undefined | null>) => string | undefined;
    sessionManager: any;
    mediaManager: any;
    gateway: any;
    agentDefaults: any;
}

export function initializeTools(tools: ToolRegistry, options: ToolInitializationOptions) {
    const {
        env,
        config,
        workspaceDir,
        rootDir,
        runtimeProcessEnv,
        authFor,
        pickString,
        sessionManager,
        mediaManager,
        gateway,
        agentDefaults
    } = options;

    const toolsCfg = config.tools || {};
    const messagesCfg = config.messages || {};

    const registerTool = (tool: any) => {
        if (tool?.name) {
            tools.register(tool);
        }
    };

    registerTool(new EchoTool());
    registerTool(new ReadFileTool({ baseDir: workspaceDir }));
    registerTool(new WriteFileTool({ baseDir: workspaceDir }));
    registerTool(new ReplaceFileTool({ baseDir: workspaceDir }));
    registerTool(new ListFilesTool({ baseDir: workspaceDir }));
    registerTool(new ShellTool({ cwd: workspaceDir, env: runtimeProcessEnv }));
    registerTool(new SystemTool());

    const notionApiKey = pickString(authFor('notion'), env.NOTION_API_KEY);
    if (notionApiKey) registerTool(new NotionTool(notionApiKey));

    const githubToken = pickString(authFor('github'), env.GITHUB_TOKEN);
    if (githubToken) registerTool(new GitHubTool(githubToken));

    registerTool(new MacProductivityTool());

    const browserCfg = config.browser || {};
    if (browserCfg.enabled !== false) {
        const browserProfiles = (
            browserCfg.profiles
            && typeof browserCfg.profiles === 'object'
            && !Array.isArray(browserCfg.profiles)
        )
            ? browserCfg.profiles
            : undefined;

        registerTool(new BrowserTool({
            evaluateEnabled: browserCfg.evaluateEnabled ?? true,
            cdpUrl: pickString(browserCfg.cdpUrl),
            remoteCdpTimeoutMs: typeof browserCfg.remoteCdpTimeoutMs === 'number' && Number.isFinite(browserCfg.remoteCdpTimeoutMs)
                ? browserCfg.remoteCdpTimeoutMs
                : undefined,
            remoteCdpHandshakeTimeoutMs: typeof browserCfg.remoteCdpHandshakeTimeoutMs === 'number' && Number.isFinite(browserCfg.remoteCdpHandshakeTimeoutMs)
                ? browserCfg.remoteCdpHandshakeTimeoutMs
                : undefined,
            executablePath: pickString(browserCfg.executablePath),
            headless: browserCfg.headless === true,
            noSandbox: browserCfg.noSandbox === true,
            attachOnly: browserCfg.attachOnly === true,
            defaultProfile: pickString(browserCfg.defaultProfile),
            snapshotDefaults: (
                browserCfg.snapshotDefaults
                && typeof browserCfg.snapshotDefaults === 'object'
                && !Array.isArray(browserCfg.snapshotDefaults)
            )
                ? browserCfg.snapshotDefaults
                : undefined,
            profiles: browserProfiles
        }));
    }

    const webSearchCfg = toolsCfg.web?.search || {};
    const webFetchCfg = toolsCfg.web?.fetch || {};
    if (webSearchCfg.enabled ?? true) {
        registerTool(new WebSearchTool({
            provider: webSearchCfg.provider,
            apiKey: pickString(webSearchCfg.apiKey),
            maxResults: webSearchCfg.maxResults,
            timeoutSeconds: webSearchCfg.timeoutSeconds,
            cacheTtlMinutes: webSearchCfg.cacheTtlMinutes,
            perplexity: {
                apiKey: pickString(webSearchCfg.perplexity?.apiKey),
                baseUrl: pickString(webSearchCfg.perplexity?.baseUrl),
                model: pickString(webSearchCfg.perplexity?.model, 'sonar-pro-search')
            },
            grok: {
                apiKey: pickString(webSearchCfg.grok?.apiKey),
                model: pickString(webSearchCfg.grok?.model, 'grok-2-1212'),
                inlineCitations: webSearchCfg.grok?.inlineCitations
            }
        }));
    }
    if (webFetchCfg.enabled ?? true) {
        registerTool(new WebFetchTool({
            maxChars: webFetchCfg.maxChars,
            maxCharsCap: webFetchCfg.maxCharsCap,
            timeoutSeconds: webFetchCfg.timeoutSeconds,
            maxRedirects: webFetchCfg.maxRedirects,
            userAgent: webFetchCfg.userAgent
        }));
    }

    const hassToken = pickString(authFor('homeassistant'), env.HASS_TOKEN);
    if (env.HASS_URL && hassToken) registerTool(new HomeAssistantTool(env.HASS_URL, hassToken));
    if (env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET) registerTool(new SpotifyTool(env.SPOTIFY_CLIENT_ID, env.SPOTIFY_CLIENT_SECRET));

    if (env.TWITTER_APP_KEY && env.TWITTER_ACCESS_TOKEN) {
        registerTool(new TwitterTool(
            env.TWITTER_APP_KEY,
            env.TWITTER_APP_SECRET || '',
            env.TWITTER_ACCESS_TOKEN,
            env.TWITTER_ACCESS_SECRET || ''
        ));
    }

    if (env.REDDIT_CLIENT_ID && env.REDDIT_REFRESH_TOKEN) {
        registerTool(new RedditTool(
            env.REDDIT_USER_AGENT || 'PowerDirector/1.0',
            env.REDDIT_CLIENT_ID,
            env.REDDIT_CLIENT_SECRET || '',
            env.REDDIT_REFRESH_TOKEN
        ));
    }

    if (env.LINKEDIN_USERNAME && env.LINKEDIN_PASSWORD) {
        const linkedIn = new LinkedInTool(env.LINKEDIN_USERNAME, env.LINKEDIN_PASSWORD);
        linkedIn.setCredentials(env.LINKEDIN_USERNAME, env.LINKEDIN_PASSWORD);
        registerTool(linkedIn);
    }

    const ttsCfg = (messagesCfg.tts && typeof messagesCfg.tts === 'object')
        ? messagesCfg.tts
        : {};
    const mediaStatus = mediaManager.getStatus();
    const imageDefaults = mediaManager.getImageDefaults();

    const openaiApiKey = pickString(authFor('openai'), env.OPENAI_API_KEY, process.env.OPENAI_API_KEY);
    const geminiApiKey = pickString(authFor('gemini'), env.GEMINI_API_KEY, process.env.GEMINI_API_KEY);

    console.log('[ToolInit] ImageGen API Keys:', {
        openai: openaiApiKey ? 'SET' : 'NOT SET',
        stability: env.STABILITY_API_KEY ? 'SET' : 'NOT SET',
        gemini: geminiApiKey ? 'SET' : 'NOT SET',
        envKeys: Object.keys(env).filter(k => k.includes('API') || k.includes('KEY')).slice(0, 10)
    });

    if (openaiApiKey) {
        registerTool(new VoiceTool(openaiApiKey, {
            tts: {
                enabled: ttsCfg.enabled ?? false,
                provider: ttsCfg.provider ?? 'openai',
                model: pickString(
                    ttsCfg.model,
                    ttsCfg.openai?.model,
                    ttsCfg.elevenlabs?.modelId
                ),
                voice: pickString(
                    ttsCfg.voice,
                    ttsCfg.openai?.voice,
                    ttsCfg.elevenlabs?.voiceId
                ),
                speed: (
                    typeof ttsCfg.speed === 'number' && Number.isFinite(ttsCfg.speed)
                        ? ttsCfg.speed
                        : ttsCfg.elevenlabs?.voiceSettings?.speed
                )
            },
            stt: {
                enabled: false,
                provider: 'whisper',
                language: 'en'
            },
            outputDir: mediaStatus.storageDir
        }));
    }
    // Check for new imageGenModel config first, then fall back to legacy config
    const imageGenModelConfig = coerceImageGenModelConfig({ agents: { defaults: agentDefaults } });

    if (openaiApiKey || env.STABILITY_API_KEY || geminiApiKey || imageGenModelConfig.primary) {
        registerTool(new ImageGenTool(openaiApiKey, env.STABILITY_API_KEY, geminiApiKey, {
            enabled: imageDefaults.enabled,
            defaultProvider: imageDefaults.provider || (geminiApiKey ? 'google' : 'openai'),
            defaultModel: imageDefaults.model,
            defaultSize: imageDefaults.size,
            preserveFilenames: mediaStatus.preserveFilenames,
            storageDir: imageDefaults.storageDir,
            maxUploadSizeBytes: mediaStatus.maxUploadBytes,
            allowedMimeTypes: mediaStatus.allowedMimeTypes,
            imageGenModel: imageGenModelConfig,
            // API keys for fallback providers
            openaiApiKey: openaiApiKey,
            stabilityApiKey: env.STABILITY_API_KEY,
            googleApiKey: geminiApiKey,
        }));
    }

    registerTool(new WeatherTool());
    registerTool(new OnePasswordTool());

    if (env.TENOR_API_KEY) registerTool(new GifTool(env.TENOR_API_KEY));
    if (env.TRELLO_API_KEY && env.TRELLO_TOKEN) registerTool(new TrelloTool(env.TRELLO_API_KEY, env.TRELLO_TOKEN));
    if (env.OBSIDIAN_VAULT_PATH) registerTool(new ObsidianTool(env.OBSIDIAN_VAULT_PATH));
    if (env.SONOS_HTTP_API_URL) registerTool(new SonosTool(env.SONOS_HTTP_API_URL));
    if (env.SHAZAM_API_KEY) registerTool(new ShazamTool(env.SHAZAM_API_KEY));
    if (env.EIGHT_SLEEP_TOKEN) registerTool(new EightSleepTool(env.EIGHT_SLEEP_TOKEN));
    if (env.OURA_TOKEN) registerTool(new OuraRingTool(env.OURA_TOKEN));
    if (env.BAMBU_IP && env.BAMBU_ACCESS_CODE) registerTool(new BambuTool(env.BAMBU_IP, env.BAMBU_ACCESS_CODE));
    if (env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN) {
        registerTool(new GmailTriggerTool(env.GMAIL_CLIENT_ID, env.GMAIL_CLIENT_SECRET, env.GMAIL_REFRESH_TOKEN));
    }

    registerTool(new PeekabooTool());
    registerTool(new Things3Tool());
    registerTool(new BearNotesTool());
    if (env.TESCO_API_KEY) registerTool(new TescoTool(env.TESCO_API_KEY));
    if (env.FOOD_ORDER_API_KEY) registerTool(new FoodOrderTool(env.FOOD_ORDER_API_KEY));

    registerTool(new AndroidTool());
    registerTool(new WindowsTool());

    registerTool(new SubagentsTool({
        sessionManager: sessionManager,
        getGateway: () => gateway
    }));

    // instead of just outputting /skill commands as text
    // Use lazy getter to ensure skillsManager is available when tool executes (not just at registration time)
    registerTool(new SkillTool({ getSkillsManager: () => gateway?.skillsManager }));

    // Set global skills manager for skill-executor (used by image-gen-router)
    if (gateway?.skillsManager) {
        setGlobalSkillsManager(gateway.skillsManager);

        // Register each enabled skill as a first-class tool
        gateway.skillsManager.getTools().forEach((t: any) => registerTool(t));
    }

    // Register Frigate NVR tool for camera snapshots with image validation
    registerTool(frigateTool);
}