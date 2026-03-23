import type { PowerDirectorConfig } from "powerdirector/plugin-sdk/core";
import type { ResolvedGoogleChatAccount } from "./accounts";
import type { GoogleChatAudienceType } from "./auth";
import { getGoogleChatRuntime } from "./runtime";

export type GoogleChatRuntimeEnv = {
  log?: (message: string) => void;
  error?: (message: string) => void;
};

export type GoogleChatMonitorOptions = {
  account: ResolvedGoogleChatAccount;
  config: PowerDirectorConfig;
  runtime: GoogleChatRuntimeEnv;
  abortSignal: AbortSignal;
  webhookPath?: string;
  webhookUrl?: string;
  statusSink?: (patch: { lastInboundAt?: number; lastOutboundAt?: number }) => void;
};

export type GoogleChatCoreRuntime = ReturnType<typeof getGoogleChatRuntime>;

export type WebhookTarget = {
  account: ResolvedGoogleChatAccount;
  config: PowerDirectorConfig;
  runtime: GoogleChatRuntimeEnv;
  core: GoogleChatCoreRuntime;
  path: string;
  audienceType?: GoogleChatAudienceType;
  audience?: string;
  statusSink?: (patch: { lastInboundAt?: number; lastOutboundAt?: number }) => void;
  mediaMaxMb: number;
};
