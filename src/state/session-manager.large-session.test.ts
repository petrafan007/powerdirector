import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { DatabaseManager } from "./db.ts";
import { SessionManager } from "./session-manager.ts";

const tempDirs: string[] = [];

function createHarness() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "powerdirector-session-manager-"));
  tempDirs.push(tempDir);

  const dbPath = path.join(tempDir, "powerdirector.db");
  const dbManager = new DatabaseManager(dbPath);
  const sessionManager = new SessionManager(dbManager);

  return { sessionManager };
}

function createSession(sessionManager: SessionManager, name = "Session") {
  const id = randomUUID();
  const now = Date.now();
  const db = (sessionManager as any).dbManager.getDb();
  db.prepare("INSERT INTO sessions (id, name, created_at, updated_at, metadata) VALUES (?, ?, ?, ?, ?)")
    .run(id, name, now, now, JSON.stringify({ customInstructions: "Stay sharp" }));
  return id;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const tempDir = tempDirs.pop();
    if (!tempDir) continue;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

describe("SessionManager bounded reads", () => {
  it("returns bounded session messages and truncates oversized content", () => {
    const { sessionManager } = createHarness();
    const sessionId = createSession(sessionManager, "Large Session");

    sessionManager.saveMessage(sessionId, {
      role: "user",
      content: "first",
      timestamp: 1,
    });
    sessionManager.saveMessage(sessionId, {
      role: "assistant",
      content: "x".repeat(60_001),
      timestamp: 2,
    });
    sessionManager.saveMessage(sessionId, {
      role: "assistant",
      content: "third",
      timestamp: 3,
    });

    const summary = sessionManager.getSessionSummary(sessionId);
    const page = sessionManager.getSessionMessages(sessionId, {
      limit: 2,
      maxContentChars: 50_000,
    });

    expect(summary?.name).toBe("Large Session");
    expect(summary?.messages).toEqual([]);
    expect(summary?.metadata.customInstructions).toBe("Stay sharp");

    expect(page.totalCount).toBe(3);
    expect(page.hasMore).toBe(true);
    expect(page.messages).toHaveLength(2);
    expect(page.messages[0]).toMatchObject({ role: "user", content: "first" });
    expect(page.messages[1]).toMatchObject({
      role: "assistant",
      content: "[Message truncated: 60001 chars]",
    });
  });

  it("finds the latest assistant response without loading the full transcript", () => {
    const { sessionManager } = createHarness();
    const sessionId = createSession(sessionManager, "Latest Assistant");

    sessionManager.saveMessage(sessionId, {
      role: "assistant",
      content: '{"tool":"shell"}',
      timestamp: 10,
      metadata: { callId: "call-1" },
    });
    sessionManager.saveMessage(sessionId, {
      role: "user",
      content: "continue",
      timestamp: 11,
    });
    sessionManager.saveMessage(sessionId, {
      role: "assistant",
      content: "final answer",
      timestamp: 12,
      metadata: { provider: "openai-codex" },
    });

    const latestAssistant = sessionManager.getLatestAssistantMessage(sessionId, { scanLimit: 10 });

    expect(latestAssistant).toMatchObject({
      role: "assistant",
      content: "final answer",
      metadata: { provider: "openai-codex" },
      timestamp: 12,
    });
  });
});
