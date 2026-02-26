import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: configDir,
  serverExternalPackages: [
    "better-sqlite3",
    "tenorjs",
    "discord.js",
    "@discordjs/ws",
    "puppeteer",
    "playwright-core",
    "playwright",
    "whatsapp-web.js",
    "matrix-js-sdk",
    "nostr-tools",
    "grammy",
    "sharp",
    "botbuilder",
    "imap-simple",
    "nodemailer",
    "node-record-lpcm16",
    "snoowrap",
    "twitter-api-v2",
    "linkedin-api",
    "spotify-web-api-node",
    "trello",
    "octokit",
    "openai",
    "systeminformation",
    "home-assistant-js-websocket",
    "qrcode-terminal",
    "cron",
    "@google/gemini-cli",
    "@openai/codex-sdk",
    "@mariozechner/pi-coding-agent",
    "@mariozechner/pi-tui",
    "koffi",
  ],
  typescript: {
    // UI build imports backend runtime modules from ../src; backend typechecking is enforced via root `npm run build`.
    // Ignore Next's duplicate typecheck pass here so webpack can produce the server bundle.
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      '@backend': path.resolve(configDir, '../src'),
    };
    // Ensure webpack can resolve .js imports to .ts files in the external backend dir
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
    };

    // Force webpack to include the shared src directory in compilation
    const tsRule = config.module.rules.find((rule) => rule.test && rule.test.toString().includes('ts'));
    if (tsRule) {
      if (Array.isArray(tsRule.include)) {
        tsRule.include.push(path.resolve(configDir, '../src'));
      } else if (tsRule.include) {
        tsRule.include = [tsRule.include, path.resolve(configDir, '../src')];
      } else {
        tsRule.include = path.resolve(configDir, '../src');
      }
    }

    if (isServer) {
      const externalPackages = {
        "@mariozechner/pi-coding-agent": "commonjs @mariozechner/pi-coding-agent",
        "@mariozechner/pi-tui": "commonjs @mariozechner/pi-tui",
        koffi: "commonjs koffi",
        "playwright-core": "commonjs playwright-core",
        playwright: "commonjs playwright",
        electron: "commonjs electron",
        sharp: "commonjs sharp",
      };
      if (Array.isArray(config.externals)) {
        config.externals.push(externalPackages);
      } else if (config.externals) {
        config.externals = [config.externals, externalPackages];
      } else {
        config.externals = [externalPackages];
      }
    }
    return config;
  },
};

export default nextConfig;
