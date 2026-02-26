import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { UpdateDaemon } from "./update-daemon.js";
import { resolveStateDir } from "../config/paths.js";
import type { loadConfig } from "../config/config.js";
import fs from "node:fs/promises";
import path from "node:path";

// Mock dependencies
vi.mock("../config/paths.js", () => ({
    resolveStateDir: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
    default: {
        mkdir: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn(),
    }
}));

vi.mock("../core/logger.js", () => ({
    getRuntimeLogger: () => ({
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    })
}));

vi.mock("./update-startup.js", () => ({
    runGatewayUpdateCheck: vi.fn().mockResolvedValue(undefined),
    getUpdateAvailable: vi.fn(),
}));

vi.mock("./update-runner.js", () => ({
    runGatewayUpdate: vi.fn().mockResolvedValue({ status: "success" }),
}));

import { runGatewayUpdateCheck, getUpdateAvailable } from "./update-startup.js";
import { runGatewayUpdate } from "./update-runner.js";

const STATE_DIR = "/mock/state/dir";

describe("UpdateDaemon", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(resolveStateDir).mockReturnValue(STATE_DIR);
        vi.mocked(fs.mkdir).mockResolvedValue(undefined);
        vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));
        vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    });

    afterEach(() => {
        //
    });

    const createMockConfig = (overrides: any = {}): ReturnType<typeof loadConfig> => {
        const autoMock = {
            enabled: true,
            stableDelayHours: 24,
            stableJitterHours: 12,
            betaCheckIntervalHours: 4,
            ...(overrides.auto || {}),
        };
        return {
            update: {
                channel: "stable",
                ...overrides,
                auto: autoMock,
            },
        } as any;
    };

    it("should not start in Nix mode", () => {
        const config = createMockConfig();
        const daemon = new UpdateDaemon(config, true);

        vi.spyOn(global, "setInterval");
        vi.spyOn(global, "setTimeout");

        daemon.start();

        expect(setInterval).not.toHaveBeenCalled();
        expect(setTimeout).not.toHaveBeenCalled();
    });

    it("should not start if auto update is disabled", () => {
        const config = createMockConfig({ auto: { enabled: false } });
        const daemon = new UpdateDaemon(config, false);

        vi.spyOn(global, "setInterval");
        vi.spyOn(global, "setTimeout");

        daemon.start();

        expect(setInterval).not.toHaveBeenCalled();
        expect(setTimeout).not.toHaveBeenCalled();
    });

    describe("tick behavior (beta channel)", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("should auto update immediately when an update is found on beta channel", async () => {
            const config = createMockConfig({ channel: "beta", auto: { betaCheckIntervalHours: 2 } });
            const daemon = new UpdateDaemon(config, false);

            vi.mocked(getUpdateAvailable).mockReturnValue({
                currentVersion: "1.0.0",
                latestVersion: "1.1.0-beta.1",
                channel: "beta",
            });

            daemon.start();

            // Advance by the 5000ms initial delay
            await vi.advanceTimersByTimeAsync(5000);

            expect(runGatewayUpdateCheck).toHaveBeenCalled();
            expect(runGatewayUpdate).toHaveBeenCalledWith({ channel: "beta" });

            daemon.stop();
        });
    });

    describe("tick behavior (stable channel)", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it("should delay stable updates and implement jitter", async () => {
            const config = createMockConfig({ channel: "stable", auto: { stableDelayHours: 24, stableJitterHours: 12 } });
            const daemon = new UpdateDaemon(config, false);

            vi.mocked(getUpdateAvailable).mockReturnValue({
                currentVersion: "1.0.0",
                latestVersion: "1.1.0",
                channel: "stable",
            });

            // It writes the delayed execution time to the state file
            let writtenState: any;
            vi.mocked(fs.writeFile).mockImplementation(async (path, data) => {
                writtenState = JSON.parse(data as string);
            });

            daemon.start();

            // Trigger the first tick (discovery)
            await vi.advanceTimersByTimeAsync(5000);

            expect(runGatewayUpdateCheck).toHaveBeenCalled();
            expect(runGatewayUpdate).not.toHaveBeenCalled(); // Should be delayed
            expect(writtenState.stableTargetTag).toBe("1.1.0");
            expect(writtenState.stableExecuteAt).toBeDefined();

            const executeTime = new Date(writtenState.stableExecuteAt).getTime();
            const now = Date.now();
            const diffHours = (executeTime - now) / 1000 / 3600;

            // The delay should be at least 24 hours, and at most 36 hours (24 + 12 jitter)
            expect(diffHours).toBeGreaterThanOrEqual(24);
            expect(diffHours).toBeLessThanOrEqual(36);

            // We need to mock `readState` so the next tick knows about the executeAt time
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(writtenState));

            // Advance time by 23 hours, should still not update
            await vi.advanceTimersByTimeAsync(23 * 3600 * 1000);
            expect(runGatewayUpdate).not.toHaveBeenCalled();

            // Advance time to surpass the maximum 36 hours
            await vi.advanceTimersByTimeAsync(14 * 3600 * 1000);

            // Our daemon polls every 10 minutes on stable, we bypassed time natively, 
            // so let's trigger another tick directly.
            // Advance by the 10 min interval
            await vi.advanceTimersByTimeAsync(10 * 60 * 1000);

            expect(runGatewayUpdate).toHaveBeenCalledWith({ channel: "stable" });

            daemon.stop();
        });
    });
});
