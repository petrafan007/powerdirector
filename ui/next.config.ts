import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const configDir = path.dirname(fileURLToPath(import.meta.url));
const appVersion = process.env.npm_package_version ?? "0.0.0";
const FORCE_SERVER_EXTERNAL_PACKAGE_PATTERNS = [
  /^@napi-rs\/canvas(?:-.+)?$/,
  /^@snazzah\/davey(?:-.+)?$/,
];

function shouldForceServerExternal(request: string): boolean {
  return FORCE_SERVER_EXTERNAL_PACKAGE_PATTERNS.some((pattern) => pattern.test(request));
}

const nextConfig: NextConfig = {
  outputFileTracingRoot: configDir,
  env: {
    NEXT_PUBLIC_PD_VERSION: appVersion,
  },
  serverExternalPackages: [
    "better-sqlite3",
    "tenorjs",
    "discord.js",
    "@discordjs/voice",
    "@discordjs/ws",
    "ws",
    "bufferutil",
    "utf-8-validate",
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
    "@anthropic-ai/sdk",
    "@google/generative-ai",
    "ollama",
    "@aws-sdk/client-bedrock",
    "systeminformation",
    "home-assistant-js-websocket",
    "qrcode-terminal",
    "cron",
    "@google/gemini-cli",
    "@openai/codex-sdk",
    "@mariozechner/pi-coding-agent",
    "@mariozechner/pi-tui",
    "koffi",
    "@line/bot-sdk",
    "@mariozechner/pi-ai",
    "@mariozechner/pi-agent-core",
    "node-llama-cpp",
    "@napi-rs/canvas",
    "@snazzah/davey",
    "protobufjs",
    "@tloncorp/api",
    "authenticate-pam",
    "esbuild",
    "sqlite-vec",
    "tar",
    "jiti",
  ],
  typescript: {
    // UI build imports backend runtime modules from ../src; backend typechecking is enforced via root `npm run build`.
    // Ignore Next's duplicate typecheck pass here so webpack can produce the server bundle.
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    config.resolve = config.resolve ?? {};
    config.ignoreWarnings = [
      {
        module: /node_modules\/@discordjs\/voice/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
      {
        module: /src-backend\/infra\/git-commit\.ts/,
        message: /Critical dependency: the request of a dependency is an expression/,
      },
      {
        module: /src-backend\/version\.ts/,
        message: /module\.createRequire failed parsing argument/,
      },
    ];
    // Ensure webpack can resolve .js imports to .ts files in the symlinked src-backend dir
    config.resolve.extensionAlias = {
      ...(config.resolve.extensionAlias ?? {}),
      ".js": [".ts", ".tsx", ".js"],
    };
    config.resolve.extensions = Array.from(new Set([
      ".ts", ".tsx", ".js", ".jsx", ...(config.resolve.extensions || [])
    ]));

    // Force webpack to include the shared src-backend directory in compilation
    const tsRule = config.module.rules.find((rule) => rule.test && rule.test.toString().includes('ts'));
    if (tsRule) {
      const srcBackendPath = path.resolve(configDir, 'src-backend');
      if (Array.isArray(tsRule.include)) {
        tsRule.include.push(srcBackendPath);
      } else if (tsRule.include) {
        tsRule.include = [tsRule.include, srcBackendPath];
      } else {
        tsRule.include = srcBackendPath;
      }
    }

    if (isServer) {
      const nativeServerExternalHandler = (
        params: { request?: string },
        callback: (error?: Error | null, result?: string) => void,
      ) => {
        const request = params.request;
        if (typeof request === "string" && shouldForceServerExternal(request)) {
          callback(null, `commonjs ${request}`);
          return;
        }
        callback();
      };
      const externalPackages = {
        "@mariozechner/pi-coding-agent": "commonjs @mariozechner/pi-coding-agent",
        "@mariozechner/pi-tui": "commonjs @mariozechner/pi-tui",
        koffi: "commonjs koffi",
        "playwright-core": "commonjs playwright-core",
        playwright: "commonjs playwright",
        electron: "commonjs electron",
        sharp: "commonjs sharp",
        "node-llama-cpp": "commonjs node-llama-cpp",
        "@napi-rs/canvas": "commonjs @napi-rs/canvas",
        "@snazzah/davey": "commonjs @snazzah/davey",
        jiti: "commonjs jiti",
      };
      if (Array.isArray(config.externals)) {
        config.externals.push(nativeServerExternalHandler, externalPackages);
      } else if (config.externals) {
        config.externals = [config.externals, nativeServerExternalHandler, externalPackages];
      } else {
        config.externals = [nativeServerExternalHandler, externalPackages];
      }
    }
    return config;
  },
  turbopack: {},
};

export default nextConfig;
