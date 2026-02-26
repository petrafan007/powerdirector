import { describe, expect, it } from "vitest";
import { resolveIrcInboundTarget } from "./monitor.js";

describe("irc monitor inbound target", () => {
  it("keeps channel target for group messages", () => {
    expect(
      resolveIrcInboundTarget({
        target: "#powerdirector",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: true,
      target: "#powerdirector",
      rawTarget: "#powerdirector",
    });
  });

  it("maps DM target to sender nick and preserves raw target", () => {
    expect(
      resolveIrcInboundTarget({
        target: "powerdirector-bot",
        senderNick: "alice",
      }),
    ).toEqual({
      isGroup: false,
      target: "alice",
      rawTarget: "powerdirector-bot",
    });
  });

  it("falls back to raw target when sender nick is empty", () => {
    expect(
      resolveIrcInboundTarget({
        target: "powerdirector-bot",
        senderNick: " ",
      }),
    ).toEqual({
      isGroup: false,
      target: "powerdirector-bot",
      rawTarget: "powerdirector-bot",
    });
  });
});
