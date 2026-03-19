import * as compatSdk from "powerdirector/plugin-sdk/compat";
import * as discordSdk from "powerdirector/plugin-sdk/discord";
import * as imessageSdk from "powerdirector/plugin-sdk/imessage";
import * as lineSdk from "powerdirector/plugin-sdk/line";
import * as msteamsSdk from "powerdirector/plugin-sdk/msteams";
import * as signalSdk from "powerdirector/plugin-sdk/signal";
import * as slackSdk from "powerdirector/plugin-sdk/slack";
import * as telegramSdk from "powerdirector/plugin-sdk/telegram";
import * as whatsappSdk from "powerdirector/plugin-sdk/whatsapp";
import { describe, expect, it } from "vitest";

const bundledExtensionSubpathLoaders = [
  { id: "acpx", load: () => import("powerdirector/plugin-sdk/acpx") },
  { id: "bluebubbles", load: () => import("powerdirector/plugin-sdk/bluebubbles") },
  { id: "copilot-proxy", load: () => import("powerdirector/plugin-sdk/copilot-proxy") },
  { id: "device-pair", load: () => import("powerdirector/plugin-sdk/device-pair") },
  { id: "diagnostics-otel", load: () => import("powerdirector/plugin-sdk/diagnostics-otel") },
  { id: "diffs", load: () => import("powerdirector/plugin-sdk/diffs") },
  { id: "feishu", load: () => import("powerdirector/plugin-sdk/feishu") },
  {
    id: "google-gemini-cli-auth",
    load: () => import("powerdirector/plugin-sdk/google-gemini-cli-auth"),
  },
  { id: "googlechat", load: () => import("powerdirector/plugin-sdk/googlechat") },
  { id: "irc", load: () => import("powerdirector/plugin-sdk/irc") },
  { id: "llm-task", load: () => import("powerdirector/plugin-sdk/llm-task") },
  { id: "lobster", load: () => import("powerdirector/plugin-sdk/lobster") },
  { id: "matrix", load: () => import("powerdirector/plugin-sdk/matrix") },
  { id: "mattermost", load: () => import("powerdirector/plugin-sdk/mattermost") },
  { id: "memory-core", load: () => import("powerdirector/plugin-sdk/memory-core") },
  { id: "memory-lancedb", load: () => import("powerdirector/plugin-sdk/memory-lancedb") },
  {
    id: "minimax-portal-auth",
    load: () => import("powerdirector/plugin-sdk/minimax-portal-auth"),
  },
  { id: "nextcloud-talk", load: () => import("powerdirector/plugin-sdk/nextcloud-talk") },
  { id: "nostr", load: () => import("powerdirector/plugin-sdk/nostr") },
  { id: "open-prose", load: () => import("powerdirector/plugin-sdk/open-prose") },
  { id: "phone-control", load: () => import("powerdirector/plugin-sdk/phone-control") },
  { id: "qwen-portal-auth", load: () => import("powerdirector/plugin-sdk/qwen-portal-auth") },
  { id: "synology-chat", load: () => import("powerdirector/plugin-sdk/synology-chat") },
  { id: "talk-voice", load: () => import("powerdirector/plugin-sdk/talk-voice") },
  { id: "test-utils", load: () => import("powerdirector/plugin-sdk/test-utils") },
  { id: "thread-ownership", load: () => import("powerdirector/plugin-sdk/thread-ownership") },
  { id: "tlon", load: () => import("powerdirector/plugin-sdk/tlon") },
  { id: "twitch", load: () => import("powerdirector/plugin-sdk/twitch") },
  { id: "voice-call", load: () => import("powerdirector/plugin-sdk/voice-call") },
  { id: "zalo", load: () => import("powerdirector/plugin-sdk/zalo") },
  { id: "zalouser", load: () => import("powerdirector/plugin-sdk/zalouser") },
] as const;

describe("plugin-sdk subpath exports", () => {
  it("exports compat helpers", () => {
    expect(typeof compatSdk.emptyPluginConfigSchema).toBe("function");
    expect(typeof compatSdk.resolveControlCommandGate).toBe("function");
  });

  it("exports Discord helpers", () => {
    expect(typeof discordSdk.resolveDiscordAccount).toBe("function");
    expect(typeof discordSdk.inspectDiscordAccount).toBe("function");
    expect(typeof discordSdk.discordOnboardingAdapter).toBe("object");
  });

  it("exports Slack helpers", () => {
    expect(typeof slackSdk.resolveSlackAccount).toBe("function");
    expect(typeof slackSdk.inspectSlackAccount).toBe("function");
    expect(typeof slackSdk.handleSlackMessageAction).toBe("function");
  });

  it("exports Telegram helpers", () => {
    expect(typeof telegramSdk.resolveTelegramAccount).toBe("function");
    expect(typeof telegramSdk.inspectTelegramAccount).toBe("function");
    expect(typeof telegramSdk.telegramOnboardingAdapter).toBe("object");
  });

  it("exports Signal helpers", () => {
    expect(typeof signalSdk.resolveSignalAccount).toBe("function");
    expect(typeof signalSdk.signalOnboardingAdapter).toBe("object");
  });

  it("exports iMessage helpers", () => {
    expect(typeof imessageSdk.resolveIMessageAccount).toBe("function");
    expect(typeof imessageSdk.imessageOnboardingAdapter).toBe("object");
  });

  it("exports WhatsApp helpers", () => {
    expect(typeof whatsappSdk.resolveWhatsAppAccount).toBe("function");
    expect(typeof whatsappSdk.whatsappOnboardingAdapter).toBe("object");
  });

  it("exports LINE helpers", () => {
    expect(typeof lineSdk.processLineMessage).toBe("function");
    expect(typeof lineSdk.createInfoCard).toBe("function");
  });

  it("exports Microsoft Teams helpers", () => {
    expect(typeof msteamsSdk.resolveControlCommandGate).toBe("function");
    expect(typeof msteamsSdk.loadOutboundMediaFromUrl).toBe("function");
  });

  it("resolves bundled extension subpaths", async () => {
    for (const { id, load } of bundledExtensionSubpathLoaders) {
      const mod = await load();
      expect(typeof mod).toBe("object");
      expect(mod, `subpath ${id} should resolve`).toBeTruthy();
    }
  });

  it("keeps the newly added bundled plugin-sdk contracts available", async () => {
    const bluebubbles = await import("powerdirector/plugin-sdk/bluebubbles");
    expect(typeof bluebubbles.parseFiniteNumber).toBe("function");

    const mattermost = await import("powerdirector/plugin-sdk/mattermost");
    expect(typeof mattermost.parseStrictPositiveInteger).toBe("function");

    const nextcloudTalk = await import("powerdirector/plugin-sdk/nextcloud-talk");
    expect(typeof nextcloudTalk.waitForAbortSignal).toBe("function");

    const twitch = await import("powerdirector/plugin-sdk/twitch");
    expect(typeof twitch.DEFAULT_ACCOUNT_ID).toBe("string");
    expect(typeof twitch.normalizeAccountId).toBe("function");
  });
});
