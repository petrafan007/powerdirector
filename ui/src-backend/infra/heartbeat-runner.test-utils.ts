import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { vi } from "vitest";
import { telegramPlugin, setTelegramRuntime } from "powerdirector/extensions/telegram/index";
import * as replyModule from "../auto-reply/reply";
import type { PowerDirectorConfig } from "../config/config";
import { resolveMainSessionKey } from "../config/sessions";
import { setActivePluginRegistry } from "../plugins/runtime";
import { createPluginRuntime } from "../plugins/runtime/index";
import { createTestRegistry } from "../test-utils/channel-plugins";

export type HeartbeatSessionSeed = {
  sessionId?: string;
  updatedAt?: number;
  lastChannel: string;
  lastProvider: string;
  lastTo: string;
};

export async function seedSessionStore(
  storePath: string,
  sessionKey: string,
  session: HeartbeatSessionSeed,
): Promise<void> {
  await fs.writeFile(
    storePath,
    JSON.stringify({
      [sessionKey]: {
        sessionId: session.sessionId ?? "sid",
        updatedAt: session.updatedAt ?? Date.now(),
        ...session,
      },
    }),
  );
}

export async function seedMainSessionStore(
  storePath: string,
  cfg: PowerDirectorConfig,
  session: HeartbeatSessionSeed,
): Promise<string> {
  const sessionKey = resolveMainSessionKey(cfg);
  await seedSessionStore(storePath, sessionKey, session);
  return sessionKey;
}

export async function withTempHeartbeatSandbox<T>(
  fn: (ctx: {
    tmpDir: string;
    storePath: string;
    replySpy: ReturnType<typeof vi.spyOn>;
  }) => Promise<T>,
  options?: {
    prefix?: string;
    unsetEnvVars?: string[];
  },
): Promise<T> {
  const tmpDir = await fs.mkdtemp(path.join(((typeof ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp")) === "function") ? ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp"))() : "/tmp"), options?.prefix ?? "powerdirector-hb-"));
  await fs.writeFile(path.join(tmpDir, "HEARTBEAT.md"), "- Check status\n", "utf-8");
  const storePath = path.join(tmpDir, "sessions.json");
  const replySpy = vi.spyOn(replyModule, "getReplyFromConfig");
  const previousEnv = new Map<string, string | undefined>();
  for (const envName of options?.unsetEnvVars ?? []) {
    previousEnv.set(envName, process.env[envName]);
    process.env[envName] = "";
  }
  try {
    return await fn({ tmpDir, storePath, replySpy });
  } finally {
    replySpy.mockRestore();
    for (const [envName, previousValue] of previousEnv.entries()) {
      if (previousValue === undefined) {
        delete process.env[envName];
      } else {
        process.env[envName] = previousValue;
      }
    }
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

export async function withTempTelegramHeartbeatSandbox<T>(
  fn: (ctx: {
    tmpDir: string;
    storePath: string;
    replySpy: ReturnType<typeof vi.spyOn>;
  }) => Promise<T>,
  options?: {
    prefix?: string;
  },
): Promise<T> {
  return withTempHeartbeatSandbox(fn, {
    prefix: options?.prefix,
    unsetEnvVars: ["TELEGRAM_BOT_TOKEN"],
  });
}

export function setupTelegramHeartbeatPluginRuntimeForTests() {
  const runtime = createPluginRuntime();
  setTelegramRuntime(runtime);
  setActivePluginRegistry(
    createTestRegistry([{ pluginId: "telegram", plugin: telegramPlugin, source: "test" }]),
  );
}
