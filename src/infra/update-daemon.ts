import fs from "node:fs/promises";
import path from "node:path";
import { getRuntimeLogger } from "../core/logger.js";
import { resolveStateDir } from "../config/paths.js";
import type { loadConfig } from "../config/config.js";
import { scheduleGatewaySigusr1Restart } from "./restart.js";
import { runGatewayUpdateCheck, getUpdateAvailable } from "./update-startup.js";
import { runGatewayUpdate, type UpdateRunResult } from "./update-runner.js";

const DAEMON_STATE_FILE = "update-daemon.json";

interface DaemonState {
    stableDiscoveredAt?: string;
    stableTargetTag?: string;
    stableExecuteAt?: string;
}

interface UpdateDaemonOptions {
    onUpdated?: (result: UpdateRunResult) => Promise<void> | void;
}

export class UpdateDaemon {
    private timer: NodeJS.Timeout | null = null;
    private cfg: ReturnType<typeof loadConfig>;
    private isNixMode: boolean;
    private logger = getRuntimeLogger();
    private checkIntervalMs: number;
    private running = false;
    private onUpdated?: UpdateDaemonOptions["onUpdated"];

    constructor(cfg: ReturnType<typeof loadConfig>, isNixMode: boolean, options: UpdateDaemonOptions = {}) {
        this.cfg = cfg;
        this.isNixMode = isNixMode;
        this.onUpdated = options.onUpdated;
        // Default check interval 10 minutes, unless beta overrides to less
        this.checkIntervalMs = 10 * 60 * 1000;
    }

    public start() {
        if (this.isNixMode || !this.cfg.update?.auto?.enabled) {
            return;
        }

        // Convert betaCheckIntervalHours to ms if on beta/dev channel
        const channel = this.cfg.update.channel || "stable";
        if (channel !== "stable") {
            const hours = this.cfg.update.auto.betaCheckIntervalHours || 4;
            this.checkIntervalMs = hours * 60 * 60 * 1000;
        }

        this.timer = setInterval(() => this.tick(), this.checkIntervalMs);
        // Also run immediately
        setTimeout(() => this.tick(), 5000);
    }

    public stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    private async readState(): Promise<DaemonState> {
        const statePath = path.join(resolveStateDir(), DAEMON_STATE_FILE);
        try {
            const raw = await fs.readFile(statePath, "utf-8");
            return JSON.parse(raw);
        } catch {
            return {};
        }
    }

    private async writeState(state: DaemonState) {
        const statePath = path.join(resolveStateDir(), DAEMON_STATE_FILE);
        await fs.mkdir(path.dirname(statePath), { recursive: true });
        await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf-8");
    }

    private async tick() {
        if (this.running) return;
        this.running = true;
        try {
            await this.doUpdateCheck();
        } catch (e) {
            this.logger.error("Update daemon check failed", { error: String(e) });
        } finally {
            this.running = false;
        }
    }

    private async doUpdateCheck() {
        const channel = this.cfg.update?.channel || "stable";

        // First, force an update check (fetch git/registry) by passing the current interval
        await runGatewayUpdateCheck({
            cfg: this.cfg,
            log: this.logger,
            isNixMode: this.isNixMode,
            allowInTests: false,
            checkIntervalMs: this.checkIntervalMs
        });

        const update = getUpdateAvailable();
        if (!update) {
            // If we previously had a stable update queued but now there's no update (e.g. they updated manually), clear state
            const state = await this.readState();
            if (state.stableExecuteAt || state.stableTargetTag) {
                await this.writeState({});
            }
            return;
        }

        if (channel !== "stable") {
            // Beta or Dev auto-update immediately
            this.logger.info(`Auto-updating directly to ${channel} channel update: ${update.latestVersion}`);
            await this.executeUpdate(channel);
            return;
        }

        // Stable logic: Delay & Jitter
        const state = await this.readState();
        const now = Date.now();

        // If we've discovered a DIFFERENT tag than what was pending, reset the delay
        if (state.stableTargetTag !== update.latestVersion) {
            const delayHours = this.cfg.update?.auto?.stableDelayHours ?? 24;
            const jitterHours = this.cfg.update?.auto?.stableJitterHours ?? 12;

            const jitter = Math.random() * jitterHours;
            const totalDelayMs = (delayHours + jitter) * 3600 * 1000;

            const executeAt = new Date(now + totalDelayMs).toISOString();
            const nextState: DaemonState = {
                stableDiscoveredAt: new Date(now).toISOString(),
                stableTargetTag: update.latestVersion,
                stableExecuteAt: executeAt
            };
            await this.writeState(nextState);
            this.logger.info(`Discovered stable update ${update.latestVersion}. Scheduled for auto-install at ${executeAt}`);
            return;
        }

        if (state.stableExecuteAt && now >= new Date(state.stableExecuteAt).getTime()) {
            this.logger.info(`Execute time reached for stable update ${update.latestVersion}. Installing now.`);
            await this.executeUpdate("stable");
            await this.writeState({});
        }
    }

    private async executeUpdate(channel: string) {
        this.logger.info(`Triggering background gateway update for channel: ${channel}`);
        const result = await runGatewayUpdate({ channel: channel as any });
        if (result.status === "error") {
            this.logger.error("Auto-update failed", { reason: result.reason, steps: result.steps });
            return;
        }
        if (result.status !== "ok") {
            return;
        }
        if (this.onUpdated) {
            await this.onUpdated(result);
            return;
        }
        scheduleGatewaySigusr1Restart({ delayMs: 0, reason: `update.auto.${channel}` });
    }
}
