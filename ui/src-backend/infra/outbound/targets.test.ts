import { describe, expect, it } from "vitest";
import { resolveSessionDeliveryTarget } from './targets';

describe("resolveSessionDeliveryTarget", () => {
  it("derives implicit delivery from the last route", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-1",
        updatedAt: 1,
        lastChannel: " whatsapp ",
        lastTo: " +1555 ",
        lastAccountId: " acct-1 ",
      },
      requestedChannel: "last",
    });

    expect(resolved).toEqual({
      channel: "whatsapp",
      to: "+1555",
      accountId: "acct-1",
      threadId: undefined,
      threadIdExplicit: false,
      mode: "implicit",
      lastChannel: "whatsapp",
      lastTo: "+1555",
      lastAccountId: "acct-1",
      lastThreadId: undefined,
    });
  });

  it("prefers explicit targets without reusing lastTo", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-2",
        updatedAt: 1,
        lastChannel: "whatsapp",
        lastTo: "+1555",
      },
      requestedChannel: "telegram",
    });

    expect(resolved).toEqual({
      channel: "telegram",
      to: undefined,
      accountId: undefined,
      threadId: undefined,
      threadIdExplicit: false,
      mode: "implicit",
      lastChannel: "whatsapp",
      lastTo: "+1555",
      lastAccountId: undefined,
      lastThreadId: undefined,
    });
  });

  it("allows mismatched lastTo when configured", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-3",
        updatedAt: 1,
        lastChannel: "whatsapp",
        lastTo: "+1555",
      },
      requestedChannel: "telegram",
      allowMismatchedLastTo: true,
    });

    expect(resolved).toEqual({
      channel: "telegram",
      to: "+1555",
      accountId: undefined,
      threadId: undefined,
      threadIdExplicit: false,
      mode: "implicit",
      lastChannel: "whatsapp",
      lastTo: "+1555",
      lastAccountId: undefined,
      lastThreadId: undefined,
    });
  });

  it("passes through explicitThreadId when provided", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-thread",
        updatedAt: 1,
        lastChannel: "telegram",
        lastTo: "-100123",
        lastThreadId: 999,
      },
      requestedChannel: "last",
      explicitThreadId: 42,
    });

    expect(resolved.threadId).toBe(42);
    expect(resolved.channel).toBe("telegram");
    expect(resolved.to).toBe("-100123");
  });

  it("uses session lastThreadId when no explicitThreadId", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-thread-2",
        updatedAt: 1,
        lastChannel: "telegram",
        lastTo: "-100123",
        lastThreadId: 999,
      },
      requestedChannel: "last",
    });

    expect(resolved.threadId).toBe(999);
  });

  it("falls back to a provided channel when requested is unsupported", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-4",
        updatedAt: 1,
        lastChannel: "whatsapp",
        lastTo: "+1555",
      },
      requestedChannel: "webchat",
      fallbackChannel: "slack",
    });

    expect(resolved).toEqual({
      channel: "slack",
      to: undefined,
      accountId: undefined,
      threadId: undefined,
      threadIdExplicit: false,
      mode: "implicit",
      lastChannel: "whatsapp",
      lastTo: "+1555",
      lastAccountId: undefined,
      lastThreadId: undefined,
    });
  });

  it("parses :topic:NNN from explicitTo into threadId", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-topic",
        updatedAt: 1,
        lastChannel: "telegram",
        lastTo: "63448508",
      },
      requestedChannel: "last",
      explicitTo: "63448508:topic:1008013",
    });

    expect(resolved.to).toBe("63448508");
    expect(resolved.threadId).toBe(1008013);
  });

  it("parses :topic:NNN even when lastTo is absent", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-no-last",
        updatedAt: 1,
        lastChannel: "telegram",
      },
      requestedChannel: "last",
      explicitTo: "63448508:topic:1008013",
    });

    expect(resolved.to).toBe("63448508");
    expect(resolved.threadId).toBe(1008013);
  });

  it("skips :topic: parsing for non-telegram channels", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-slack",
        updatedAt: 1,
        lastChannel: "slack",
        lastTo: "C12345",
      },
      requestedChannel: "last",
      explicitTo: "C12345:topic:999",
    });

    expect(resolved.to).toBe("C12345:topic:999");
    expect(resolved.threadId).toBeUndefined();
  });

  it("skips :topic: parsing when channel is explicitly non-telegram even if lastChannel was telegram", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-cross",
        updatedAt: 1,
        lastChannel: "telegram",
        lastTo: "63448508",
      },
      requestedChannel: "slack",
      explicitTo: "C12345:topic:999",
    });

    expect(resolved.to).toBe("C12345:topic:999");
    expect(resolved.threadId).toBeUndefined();
  });

  it("explicitThreadId takes priority over :topic: parsed value", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-priority",
        updatedAt: 1,
        lastChannel: "telegram",
        lastTo: "63448508",
      },
      requestedChannel: "last",
      explicitTo: "63448508:topic:1008013",
      explicitThreadId: 42,
    });

    expect(resolved.threadId).toBe(42);
    expect(resolved.to).toBe("63448508");
  });
});

describe("resolveSessionDeliveryTarget – cross-channel routing isolation", () => {
  it("pins reply to turn-source channel, ignoring mutable session lastChannel", () => {
    // Simulate: agent turn started on whatsapp, then concurrent inbound updated session to telegram.
    // Without turnSourceChannel, the reply would go to telegram. With it, it must stay on whatsapp.
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-race",
        updatedAt: 1,
        // Session lastChannel has been updated to telegram by a concurrent inbound
        lastChannel: "telegram",
        lastTo: "tg-user",
        lastAccountId: "tg-acct",
      },
      requestedChannel: "last",
      // Agent turn was initiated by whatsapp – pin to it
      turnSourceChannel: "whatsapp",
      turnSourceTo: "+1555",
      turnSourceAccountId: "wa-acct",
    });

    expect(resolved.channel).toBe("whatsapp");
    expect(resolved.to).toBe("+1555");
    expect(resolved.accountId).toBe("wa-acct");
    // lastChannel/lastTo reflect session-level fields (unchanged output contract)
    expect(resolved.lastChannel).toBe("whatsapp");
    expect(resolved.lastTo).toBe("+1555");
  });

  it("without turnSourceChannel, still uses session lastChannel normally", () => {
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-no-pin",
        updatedAt: 1,
        lastChannel: "whatsapp",
        lastTo: "+1555",
        lastAccountId: "wa-acct",
      },
      requestedChannel: "last",
    });

    expect(resolved.channel).toBe("whatsapp");
    expect(resolved.to).toBe("+1555");
    expect(resolved.accountId).toBe("wa-acct");
  });

  it("turnSourceChannel=undefined behaves identically to not providing it", () => {
    const withUndefined = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-undef",
        updatedAt: 1,
        lastChannel: "slack",
        lastTo: "U12345",
      },
      requestedChannel: "last",
      turnSourceChannel: undefined,
    });
    const withoutProp = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-undef",
        updatedAt: 1,
        lastChannel: "slack",
        lastTo: "U12345",
      },
      requestedChannel: "last",
    });

    expect(withUndefined).toEqual(withoutProp);
  });

  it("does not fall back to mutable session metadata when turnSourceTo is undefined (fail-closed)", () => {
    // If turnSourceChannel is set but turnSourceTo is absent, we must NOT fall back to session lastTo.
    // This is the stricter upstream v2026.2.25 fail-closed behavior.
    const resolved = resolveSessionDeliveryTarget({
      entry: {
        sessionId: "sess-fail-closed",
        updatedAt: 1,
        lastChannel: "telegram",
        lastTo: "tg-user",
      },
      requestedChannel: "last",
      turnSourceChannel: "whatsapp",
      // turnSourceTo intentionally absent
    });

    expect(resolved.channel).toBe("whatsapp");
    // Must NOT inherit 'tg-user' from session metadata
    expect(resolved.to).toBeUndefined();
  });
});
