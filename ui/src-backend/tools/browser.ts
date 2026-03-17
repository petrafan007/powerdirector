// @ts-nocheck
import { Tool, ToolResult } from './base';
import puppeteer, { Browser, Page } from 'puppeteer';

type BrowserProfileConfig = {
    cdpPort?: number;
    cdpUrl?: string;
    driver?: 'clawd' | 'extension';
    color?: string;
};

export interface BrowserToolConfig {
    evaluateEnabled?: boolean;
    cdpUrl?: string;
    remoteCdpTimeoutMs?: number;
    remoteCdpHandshakeTimeoutMs?: number;
    executablePath?: string;
    headless?: boolean;
    noSandbox?: boolean;
    attachOnly?: boolean;
    defaultProfile?: string;
    snapshotDefaults?: {
        mode?: 'efficient';
    };
    profiles?: Record<string, BrowserProfileConfig>;
}

interface ResolvedBrowserToolConfig {
    evaluateEnabled: boolean;
    cdpUrl: string;
    remoteCdpTimeoutMs: number;
    remoteCdpHandshakeTimeoutMs: number;
    headless: boolean;
    executablePath: string;
    noSandbox: boolean;
    attachOnly: boolean;
    defaultProfile: string;
    snapshotDefaults: {
        mode?: 'efficient';
    };
    profiles: Record<string, BrowserProfileConfig>;
}

export class BrowserTool implements Tool {
    public name = 'browser';
    public description = 'Control a headless Chrome browser. Actions: goto, content, screenshot, click, type.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['goto', 'content', 'screenshot', 'click', 'type'] },
            url: { type: 'string', description: 'URL to navigate to (for goto)' },
            selector: { type: 'string', description: 'CSS selector (for click/type)' },
            text: { type: 'string', description: 'Text to type (for type)' }
        },
        required: ['action']
    };

    private browser: Browser | null = null;
    private page: Page | null = null;
    private config: ResolvedBrowserToolConfig;

    constructor(config: BrowserToolConfig = {}) {
        const remoteCdpTimeoutMs = this.normalizeTimeout(config.remoteCdpTimeoutMs, 1500);
        this.config = {
            evaluateEnabled: config.evaluateEnabled ?? true,
            cdpUrl: config.cdpUrl?.trim() || '',
            remoteCdpTimeoutMs,
            remoteCdpHandshakeTimeoutMs: this.normalizeTimeout(
                config.remoteCdpHandshakeTimeoutMs,
                Math.max(2000, remoteCdpTimeoutMs * 2)
            ),
            headless: config.headless ?? true,
            executablePath: config.executablePath?.trim() || '',
            noSandbox: config.noSandbox === true,
            attachOnly: config.attachOnly === true,
            defaultProfile: config.defaultProfile?.trim() || 'chrome',
            snapshotDefaults: {
                mode: config.snapshotDefaults?.mode === 'efficient' ? 'efficient' : undefined
            },
            profiles: this.normalizeProfiles(config.profiles)
        };
    }

    private normalizeTimeout(raw: number | undefined, fallback: number): number {
        const value = typeof raw === 'number' && Number.isFinite(raw) ? Math.floor(raw) : fallback;
        return value >= 0 ? value : fallback;
    }

    private normalizeProfiles(raw: Record<string, BrowserProfileConfig> | undefined): Record<string, BrowserProfileConfig> {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
        const profiles: Record<string, BrowserProfileConfig> = {};
        for (const [key, value] of Object.entries(raw)) {
            if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
            profiles[key] = {
                cdpPort: typeof value.cdpPort === 'number' && Number.isFinite(value.cdpPort) ? value.cdpPort : undefined,
                cdpUrl: typeof value.cdpUrl === 'string' ? value.cdpUrl.trim() : undefined,
                driver: value.driver === 'extension' ? 'extension' : (value.driver === 'clawd' ? 'clawd' : undefined),
                color: typeof value.color === 'string' ? value.color : undefined
            };
        }
        return profiles;
    }

    private parseHttpUrl(raw: string): { protocol: 'http' | 'https'; host: string; port: number; normalized: string } {
        const parsed = new URL(raw.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new Error(`Browser CDP URL must be http(s), got: ${parsed.protocol.replace(':', '')}`);
        }
        const protocol: 'http' | 'https' = parsed.protocol === 'https:' ? 'https' : 'http';
        const port = parsed.port
            ? Number.parseInt(parsed.port, 10)
            : (protocol === 'https' ? 443 : 80);
        if (!Number.isFinite(port) || port < 1 || port > 65535) {
            throw new Error(`Browser CDP URL has invalid port: ${parsed.port}`);
        }
        const normalized = parsed.toString().replace(/\/$/, '');
        return {
            protocol,
            host: parsed.hostname,
            port,
            normalized
        };
    }

    private resolveProfileName(): string | undefined {
        if (this.config.profiles[this.config.defaultProfile]) return this.config.defaultProfile;
        if (this.config.profiles.powerdirector) return 'powerdirector';
        const profileNames = Object.keys(this.config.profiles);
        return profileNames.length > 0 ? profileNames[0] : undefined;
    }

    private resolveCdpEndpoint(): string | undefined {
        let baseProtocol: 'http' | 'https' = 'http';
        let baseHost = '127.0.0.1';
        if (this.config.cdpUrl) {
            const parsedBase = this.parseHttpUrl(this.config.cdpUrl);
            baseProtocol = parsedBase.protocol;
            baseHost = parsedBase.host;
        }

        const profileName = this.resolveProfileName();
        if (profileName) {
            const profile = this.config.profiles[profileName];
            if (profile?.cdpUrl) {
                return this.parseHttpUrl(profile.cdpUrl).normalized;
            }
            if (profile?.cdpPort && profile.cdpPort >= 1 && profile.cdpPort <= 65535) {
                return `${baseProtocol}://${baseHost}:${profile.cdpPort}`;
            }
        }

        if (this.config.cdpUrl) {
            return this.parseHttpUrl(this.config.cdpUrl).normalized;
        }

        return undefined;
    }

    private async connectWithTimeout(browserURL: string): Promise<Browser> {
        const connectPromise = puppeteer.connect({
            browserURL,
            protocolTimeout: this.config.remoteCdpTimeoutMs || undefined
        });
        if (this.config.remoteCdpHandshakeTimeoutMs <= 0) {
            return connectPromise;
        }

        let timer: NodeJS.Timeout | null = null;
        const timeoutPromise = new Promise<Browser>((_, reject) => {
            timer = setTimeout(
                () => reject(new Error(`Browser CDP handshake timed out after ${this.config.remoteCdpHandshakeTimeoutMs}ms`)),
                this.config.remoteCdpHandshakeTimeoutMs
            );
        });

        try {
            return await Promise.race([connectPromise, timeoutPromise]);
        } finally {
            if (timer) clearTimeout(timer);
        }
    }

    private async ensureBrowser(): Promise<void> {
        if (this.browser) return;

        const cdpEndpoint = this.resolveCdpEndpoint();
        if (cdpEndpoint) {
            try {
                this.browser = await this.connectWithTimeout(cdpEndpoint);
            } catch (error: any) {
                if (this.config.attachOnly) {
                    throw new Error(`Failed to attach to browser profile at ${cdpEndpoint}: ${error?.message || String(error)}`);
                }
            }
        }

        if (!this.browser) {
            if (this.config.attachOnly) {
                throw new Error('browser.attachOnly is enabled but no reachable CDP endpoint was resolved.');
            }
            const launchArgs = this.config.noSandbox
                ? ['--no-sandbox', '--disable-setuid-sandbox']
                : [];
            this.browser = await puppeteer.launch({
                headless: this.config.headless,
                executablePath: this.config.executablePath || undefined,
                args: launchArgs
            });
        }

        const pages = await this.browser.pages();
        this.page = pages[0] || await this.browser.newPage();
        await this.page.setViewport({ width: 1280, height: 800 });
        this.page.setDefaultTimeout(30000);
    }

    async execute(args: any): Promise<ToolResult> {
        try {
            if (args.action === 'content' && !this.config.evaluateEnabled) {
                return {
                    output: 'browser.content is disabled by settings (browser.evaluateEnabled=false).',
                    isError: true
                };
            }

            await this.ensureBrowser();
            const page = this.page!;

            switch (args.action) {
                case 'goto':
                    if (!args.url) return { output: 'URL required', isError: true };
                    await page.goto(args.url, { waitUntil: 'networkidle2', timeout: 30000 });
                    return { output: `Navigated to ${args.url}` };

                case 'content':
                    // Return text content (or HTML if needed, but text is cheaper token-wise)
                    const content = await page.evaluate(() => document.body.innerText);
                    return { output: content };

                case 'screenshot':
                    const screenshot = this.config.snapshotDefaults.mode === 'efficient'
                        ? await page.screenshot({ type: 'jpeg', quality: 70, encoding: 'base64' })
                        : await page.screenshot({ encoding: 'base64' });
                    // Provide data URI or just say captured. For LLM usually description is better, or base64 if multimodal.
                    // For now, return base64 string (truncated log)
                    return {
                        output: `Screenshot captured (${this.config.snapshotDefaults.mode === 'efficient' ? 'efficient' : 'default'}, base64 length: ${String(screenshot).length})`
                    };

                case 'click':
                    if (!args.selector) return { output: 'Selector required', isError: true };
                    await page.click(args.selector);
                    return { output: `Clicked ${args.selector}` };

                case 'type':
                    if (!args.selector || !args.text) return { output: 'Selector and text required', isError: true };
                    await page.type(args.selector, args.text);
                    return { output: `Typed "${args.text}" into ${args.selector}` };

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Browser Error: ${error.message}`, isError: true };
        }
    }

    // Cleanup if needed (not standard Tool method but good practice)
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }
}
