import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveOutboundTarget: vi.fn(() => ({ ok: true as const, to: "+1999" })),
}));

vi.mock("./targets.js", async () => {
  const actual = await vi.importActual<typeof import('./targets')>("./targets.js");
  return {
    ...actual,
    resolveOutboundTarget: mocks.resolveOutboundTarget,
  };
});

import type { PowerDirectorConfig } from '../../config/config';
import { resolveAgentDeliveryPlan, resolveAgentOutboundTarget } from './agent-delivery';

describe("agent delivery helpers", () => {
  it("builds a delivery plan from session delivery context", () => {
    const plan = resolveAgentDeliveryPlan({
      sessionEntry: {
        sessionId: "s1",
        updatedAt: 1,
        deliveryContext: { channel: "whatsapp", to: "+1555", accountId: "work" },
      },
      requestedChannel: "last",
      explicitTo: undefined,
      accountId: undefined,
      wantsDelivery: true,
    });

    expect(plan.resolvedChannel).toBe("whatsapp");
    expect(plan.resolvedTo).toBe("+1555");
    expect(plan.resolvedAccountId).toBe("work");
    expect(plan.deliveryTargetMode).toBe("implicit");
  });

  it("resolves fallback targets when no explicit destination is provided", () => {
    const plan = resolveAgentDeliveryPlan({
      sessionEntry: {
        sessionId: "s2",
        updatedAt: 2,
        deliveryContext: { channel: "whatsapp" },
      },
      requestedChannel: "last",
      explicitTo: undefined,
      accountId: undefined,
      wantsDelivery: true,
    });

    const resolved = resolveAgentOutboundTarget({
      cfg: {} as PowerDirectorConfig,
      plan,
      targetMode: "implicit",
    });

    expect(mocks.resolveOutboundTarget).toHaveBeenCalledTimes(1);
    expect(resolved.resolvedTarget?.ok).toBe(true);
    expect(resolved.resolvedTo).toBe("+1999");
  });

  it("skips outbound target resolution when explicit target validation is disabled", () => {
    const plan = resolveAgentDeliveryPlan({
      sessionEntry: {
        sessionId: "s3",
        updatedAt: 3,
        deliveryContext: { channel: "whatsapp", to: "+1555" },
      },
      requestedChannel: "last",
      explicitTo: "+1555",
      accountId: undefined,
      wantsDelivery: true,
    });

    mocks.resolveOutboundTarget.mockClear();
    const resolved = resolveAgentOutboundTarget({
      cfg: {} as PowerDirectorConfig,
      plan,
      targetMode: "explicit",
      validateExplicitTarget: false,
    });

    expect(mocks.resolveOutboundTarget).not.toHaveBeenCalled();
    expect(resolved.resolvedTo).toBe("+1555");
  });

  it("passes normalized turnSourceChannel through to delivery target resolution", () => {
    // When a turn-source channel is provided, the plan should use it (not the session lastChannel).
    // The session was last active on telegram, but the turn came from whatsapp.
    const plan = resolveAgentDeliveryPlan({
      sessionEntry: {
        sessionId: "s4",
        updatedAt: 4,
        deliveryContext: { channel: "telegram", to: "tg-user" },
      },
      requestedChannel: "last",
      wantsDelivery: true,
      turnSourceChannel: "whatsapp",
      turnSourceTo: "+1555",
      turnSourceAccountId: "wa-acct",
    });

    // With turnSourceChannel pinned to whatsapp, channel must resolve to whatsapp
    expect(plan.resolvedChannel).toBe("whatsapp");
    expect(plan.baseDelivery.channel).toBe("whatsapp");
    expect(plan.baseDelivery.to).toBe("+1555");
  });

  it("ignores invalid turnSourceChannel values (non-deliverable channels)", () => {
    const plan = resolveAgentDeliveryPlan({
      sessionEntry: {
        sessionId: "s5",
        updatedAt: 5,
        deliveryContext: { channel: "whatsapp", to: "+1555" },
      },
      requestedChannel: "last",
      wantsDelivery: true,
      turnSourceChannel: "not-a-real-channel",
    });

    // Falls back to session delivery normally
    expect(plan.resolvedChannel).toBe("whatsapp");
  });
});
