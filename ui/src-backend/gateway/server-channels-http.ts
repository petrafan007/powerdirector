import type { IncomingMessage, ServerResponse } from "node:http";
import { authorizeGatewayConnect, type ResolvedGatewayAuth } from "./auth";
import { getBearerToken } from "./http-utils";
import { sendGatewayAuthFailure } from "./http-common";
import { type ChannelManager } from "./server-channels";
import { listChannelPlugins } from "../channels/plugins/index";
import { loadConfig } from "../config/config";
import type { AuthRateLimiter } from "./auth-rate-limit";

function sendJson(res: ServerResponse, status: number, body: unknown) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
}

export async function handleChannelsHttpRequest(
    req: IncomingMessage,
    res: ServerResponse,
    opts: {
        channelsHost: ChannelManager;
        auth: ResolvedGatewayAuth;
        trustedProxies: string[];
        rateLimiter?: AuthRateLimiter;
    },
): Promise<boolean> {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname !== "/channels/status") {
        return false;
    }

    if (req.method !== "GET") {
        sendJson(res, 405, { error: "Method Not Allowed" });
        return true;
    }

    const token = getBearerToken(req);
    const authResult = await authorizeGatewayConnect({
        auth: opts.auth,
        connectAuth: token ? { token, password: token } : null,
        req,
        trustedProxies: opts.trustedProxies,
        rateLimiter: opts.rateLimiter,
    });

    if (!authResult.ok) {
        sendGatewayAuthFailure(res, authResult);
        return true;
    }

    const doProbe = url.searchParams.get("probe") === "true";
    const channelFilterRaw = (url.searchParams.get("channel") || "").trim().toLowerCase();

    const cfg = loadConfig();
    const plugins = listChannelPlugins();
    const snapshot = opts.channelsHost.getRuntimeSnapshot();

    const channelsData = await Promise.all(
        plugins.map(async (p) => {
            let probeResult: { ok: boolean; error?: string } = { ok: true };
            const shouldProbe = doProbe && (!channelFilterRaw || p.id.toLowerCase() === channelFilterRaw);

            // oxlint-disable-next-line typescript/no-explicit-any
            const pstatus: any = p.status;
            if (shouldProbe && typeof pstatus?.probe === "function") {
                try {
                    const accounts = p.config.listAccountIds(cfg);
                    const firstAccount = accounts[0];
                    if (firstAccount) {
                        const account = p.config.resolveAccount(cfg, firstAccount);
                        probeResult = await pstatus.probe(account, cfg);
                    }
                } catch (e: any) {
                    probeResult = { ok: false, error: e.message };
                }
            }

            const state = snapshot.channels[p.id];
            const isRunning = state?.running ?? false;

            return {
                id: p.id,
                name: p.id,
                enabled: state?.enabled ?? true, // If it's registered it's implicitly configurable
                status: isRunning ? "Active" : "Error",
                config: {},
                lastError: state?.lastError,
                probe: shouldProbe ? probeResult : undefined,
            };
        }),
    );

    const filtered = channelFilterRaw
        ? channelsData.filter((row) => String(row.id || "").toLowerCase() === channelFilterRaw)
        : channelsData;

    sendJson(res, 200, { channels: filtered });
    return true;
}
