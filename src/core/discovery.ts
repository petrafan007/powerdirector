// @ts-nocheck
import { spawn } from 'node:child_process';
import { getRuntimeLogger } from './logger.js';

type MdnsDiscoveryMode = 'off' | 'minimal' | 'full';

export interface DiscoveryConfig {
    wideArea?: {
        enabled?: boolean;
        domain?: string;
    };
    mdns?: {
        mode?: MdnsDiscoveryMode;
    };
}

interface DiscoveryStatusSnapshot {
    wideArea: {
        enabled: boolean;
        domain: string | null;
        active: boolean;
        warning: string | null;
    };
    mdns: {
        mode: MdnsDiscoveryMode;
        advertising: boolean;
    };
    started: boolean;
}

export class DiscoveryManager {
    private readonly logger = getRuntimeLogger();
    private readonly wideAreaEnabled: boolean;
    private readonly wideAreaDomain: string | null;
    private readonly mdnsMode: MdnsDiscoveryMode;
    private readonly serviceName: string;
    private wideAreaWarning: string | null = null;
    private advertiseProcess: ReturnType<typeof spawn> | null = null;
    private started = false;

    constructor(config: DiscoveryConfig = {}) {
        this.wideAreaEnabled = config.wideArea?.enabled === true;
        this.wideAreaDomain = typeof config.wideArea?.domain === 'string' && config.wideArea.domain.trim().length > 0
            ? config.wideArea.domain.trim()
            : null;
        this.mdnsMode = config.mdns?.mode ?? 'minimal';
        this.serviceName = 'powerdirector';
    }

    public async start(servicePort: number): Promise<void> {
        if (this.started) return;

        const config = getConfigManager().get();
        if (!config) {
            this.logger.error(`[DiscoveryManager] Missing config in getConfigManager().get(). ConfigPath: ${getConfigManager().getConfigPath()}`);
        }
        this.started = true;

        if (this.mdnsMode !== 'off') {
            this.startMdnsAdvertise(servicePort);
        }

        if (this.wideAreaEnabled) {
            if (!this.wideAreaDomain) {
                this.wideAreaWarning = 'discovery.wideArea.enabled is true, but no discovery.wideArea.domain is configured.';
                this.logger.warn(this.wideAreaWarning);
            } else {
                this.wideAreaWarning = 'discovery.wideArea.domain is configured, but wide-area DNS-SD automation is not implemented in this runtime.';
                this.logger.warn(this.wideAreaWarning);
            }
        }
    }

    public stop(): void {
        if (this.advertiseProcess) {
            try {
                this.advertiseProcess.kill('SIGTERM');
            } catch {
                // ignored
            }
            this.advertiseProcess = null;
        }
        this.started = false;
    }

    public async probePeers(): Promise<never[]> {
        return [];
    }

    public getStatus(): DiscoveryStatusSnapshot {
        return {
            wideArea: {
                enabled: this.wideAreaEnabled,
                domain: this.wideAreaDomain,
                active: this.wideAreaEnabled && this.wideAreaDomain !== null,
                warning: this.wideAreaWarning
            },
            mdns: {
                mode: this.mdnsMode,
                advertising: Boolean(this.advertiseProcess)
            },
            started: this.started,
        };
    }

    private startMdnsAdvertise(servicePort: number): void {
        try {
            this.advertiseProcess = spawn('avahi-publish-service', [
                this.serviceName,
                '_powerdirector._tcp',
                String(servicePort)
            ], {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            this.advertiseProcess.on('error', (error: any) => {
                this.logger.warn(`mDNS advertise unavailable: ${error.message}`);
                this.advertiseProcess = null;
            });

            this.advertiseProcess.stderr?.on('data', (chunk: Buffer) => {
                const msg = chunk.toString('utf-8').trim();
                if (msg) {
                    this.logger.warn(`mDNS advertise stderr: ${msg}`);
                }
            });

            this.advertiseProcess.on('close', (code) => {
                this.logger.warn(`mDNS advertise process exited with code ${code}.`);
                this.advertiseProcess = null;
            });
        } catch (error: any) {
            this.logger.warn(`Failed to start mDNS advertise: ${error.message}`);
            this.advertiseProcess = null;
        }
    }
}
