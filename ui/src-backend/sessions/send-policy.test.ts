import { describe, expect, it } from "vitest";
import type { PowerDirectorConfig } from '../config/config';
import type { SessionEntry } from '../config/sessions';
import { resolveSendPolicy } from './send-policy';

describe("resolveSendPolicy", () => {
  it("defaults to allow", () => {
    const cfg = {} as PowerDirectorConfig;
    expect(resolveSendPolicy({ cfg })).toBe("allow");
  });

  it("entry override wins", () => {
    const cfg = {
      session: { sendPolicy: { default: "allow" } },
    } as PowerDirectorConfig;
    const entry: SessionEntry = {
      sessionId: "s",
      updatedAt: 0,
      sendPolicy: "deny",
    };
    expect(resolveSendPolicy({ cfg, entry })).toBe("deny");
  });

  it("rule match by channel + chatType", () => {
    const cfg = {
      session: {
        sendPolicy: {
          default: "allow",
          rules: [
            {
              action: "deny",
              match: { channel: "discord", chatType: "group" },
            },
          ],
        },
      },
    } as PowerDirectorConfig;
    const entry: SessionEntry = {
      sessionId: "s",
      updatedAt: 0,
      channel: "discord",
      chatType: "group",
    };
    expect(resolveSendPolicy({ cfg, entry, sessionKey: "discord:group:dev" })).toBe("deny");
  });

  it("rule match by keyPrefix", () => {
    const cfg = {
      session: {
        sendPolicy: {
          default: "allow",
          rules: [{ action: "deny", match: { keyPrefix: "cron:" } }],
        },
      },
    } as PowerDirectorConfig;
    expect(resolveSendPolicy({ cfg, sessionKey: "cron:job-1" })).toBe("deny");
  });

  it("rule match by rawKeyPrefix", () => {
    const cfg = {
      session: {
        sendPolicy: {
          default: "allow",
          rules: [{ action: "deny", match: { rawKeyPrefix: "agent:main:discord:" } }],
        },
      },
    } as PowerDirectorConfig;
    expect(resolveSendPolicy({ cfg, sessionKey: "agent:main:discord:group:dev" })).toBe("deny");
    expect(resolveSendPolicy({ cfg, sessionKey: "agent:main:slack:group:dev" })).toBe("allow");
  });
});
