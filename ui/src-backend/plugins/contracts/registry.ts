import amazonBedrockPlugin from "@/src-backend/extensions/amazon-bedrock/index";
import anthropicPlugin from "@/src-backend/extensions/anthropic/index";
import bravePlugin from "@/src-backend/extensions/brave/index";
import byteplusPlugin from "@/src-backend/extensions/byteplus/index";
import chutesPlugin from "@/src-backend/extensions/chutes/index";
import cloudflareAiGatewayPlugin from "@/src-backend/extensions/cloudflare-ai-gateway/index";
import copilotProxyPlugin from "@/src-backend/extensions/copilot-proxy/index";
import elevenLabsPlugin from "@/src-backend/extensions/elevenlabs/index";
import falPlugin from "@/src-backend/extensions/fal/index";
import firecrawlPlugin from "@/src-backend/extensions/firecrawl/index";
import githubCopilotPlugin from "@/src-backend/extensions/github-copilot/index";
import googlePlugin from "@/src-backend/extensions/google/index";
import huggingFacePlugin from "@/src-backend/extensions/huggingface/index";
import kilocodePlugin from "@/src-backend/extensions/kilocode/index";
import kimiCodingPlugin from "@/src-backend/extensions/kimi-coding/index";
import microsoftPlugin from "@/src-backend/extensions/microsoft/index";
import minimaxPlugin from "@/src-backend/extensions/minimax/index";
import mistralPlugin from "@/src-backend/extensions/mistral/index";
import modelStudioPlugin from "@/src-backend/extensions/modelstudio/index";
import moonshotPlugin from "@/src-backend/extensions/moonshot/index";
import nvidiaPlugin from "@/src-backend/extensions/nvidia/index";
import ollamaPlugin from "@/src-backend/extensions/ollama/index";
import openAIPlugin from "@/src-backend/extensions/openai/index";
import opencodeGoPlugin from "@/src-backend/extensions/opencode-go/index";
import opencodePlugin from "@/src-backend/extensions/opencode/index";
import openrouterPlugin from "@/src-backend/extensions/openrouter/index";
import perplexityPlugin from "@/src-backend/extensions/perplexity/index";
import qianfanPlugin from "@/src-backend/extensions/qianfan/index";
import qwenPortalAuthPlugin from "@/src-backend/extensions/qwen-portal-auth/index";
import sglangPlugin from "@/src-backend/extensions/sglang/index";
import syntheticPlugin from "@/src-backend/extensions/synthetic/index";
import togetherPlugin from "@/src-backend/extensions/together/index";
import venicePlugin from "@/src-backend/extensions/venice/index";
import vercelAiGatewayPlugin from "@/src-backend/extensions/vercel-ai-gateway/index";
import vllmPlugin from "@/src-backend/extensions/vllm/index";
import volcenginePlugin from "@/src-backend/extensions/volcengine/index";
import xaiPlugin from "@/src-backend/extensions/xai/index";
import xiaomiPlugin from "@/src-backend/extensions/xiaomi/index";
import zaiPlugin from "@/src-backend/extensions/zai/index";
import { createCapturedPluginRegistration } from "../captured-registration";
import { resolvePluginProviders } from "../providers";
import type {
  ImageGenerationProviderPlugin,
  MediaUnderstandingProviderPlugin,
  ProviderPlugin,
  SpeechProviderPlugin,
  WebSearchProviderPlugin,
} from "../types";

type RegistrablePlugin = {
  id: string;
  register: (api: ReturnType<typeof createCapturedPluginRegistration>["api"]) => void;
};

type CapabilityContractEntry<T> = {
  pluginId: string;
  provider: T;
};

type ProviderContractEntry = CapabilityContractEntry<ProviderPlugin>;

type WebSearchProviderContractEntry = CapabilityContractEntry<WebSearchProviderPlugin> & {
  credentialValue: unknown;
};

type SpeechProviderContractEntry = CapabilityContractEntry<SpeechProviderPlugin>;
type MediaUnderstandingProviderContractEntry =
  CapabilityContractEntry<MediaUnderstandingProviderPlugin>;
type ImageGenerationProviderContractEntry = CapabilityContractEntry<ImageGenerationProviderPlugin>;

type PluginRegistrationContractEntry = {
  pluginId: string;
  providerIds: string[];
  speechProviderIds: string[];
  mediaUnderstandingProviderIds: string[];
  imageGenerationProviderIds: string[];
  webSearchProviderIds: string[];
  toolNames: string[];
};

const bundledWebSearchPlugins: Array<RegistrablePlugin & { credentialValue: unknown }> = [
  { ...bravePlugin, credentialValue: "BSA-test" },
  { ...firecrawlPlugin, credentialValue: "fc-test" },
  { ...googlePlugin, credentialValue: "AIza-test" },
  { ...moonshotPlugin, credentialValue: "sk-test" },
  { ...perplexityPlugin, credentialValue: "pplx-test" },
  { ...xaiPlugin, credentialValue: "xai-test" },
];

const bundledSpeechPlugins: RegistrablePlugin[] = [elevenLabsPlugin, microsoftPlugin, openAIPlugin];

const bundledMediaUnderstandingPlugins: RegistrablePlugin[] = [
  anthropicPlugin,
  googlePlugin,
  minimaxPlugin,
  mistralPlugin,
  moonshotPlugin,
  openAIPlugin,
  zaiPlugin,
];

const bundledImageGenerationPlugins: RegistrablePlugin[] = [falPlugin, googlePlugin, openAIPlugin];

function captureRegistrations(plugin: RegistrablePlugin) {
  const captured = createCapturedPluginRegistration();
  plugin.register(captured.api);
  return captured;
}

function buildCapabilityContractRegistry<T>(params: {
  plugins: RegistrablePlugin[];
  select: (captured: ReturnType<typeof createCapturedPluginRegistration>) => T[];
}): CapabilityContractEntry<T>[] {
  return params.plugins.flatMap((plugin) => {
    const captured = captureRegistrations(plugin);
    return params.select(captured).map((provider) => ({
      pluginId: plugin.id,
      provider,
    }));
  });
}

function dedupePlugins<T extends RegistrablePlugin>(
  plugins: ReadonlyArray<T | undefined | null>,
): T[] {
  return [
    ...new Map(
      plugins.filter((plugin): plugin is T => Boolean(plugin)).map((plugin) => [plugin.id, plugin]),
    ).values(),
  ];
}

export let providerContractLoadError: Error | undefined;

function loadBundledProviderRegistry(): ProviderContractEntry[] {
  try {
    providerContractLoadError = undefined;
    return resolvePluginProviders({
      bundledProviderAllowlistCompat: true,
      bundledProviderVitestCompat: true,
      cache: false,
      activate: false,
    })
      .filter((provider): provider is ProviderPlugin & { pluginId: string } =>
        Boolean(provider.pluginId),
      )
      .map((provider) => ({
        pluginId: provider.pluginId,
        provider,
      }));
  } catch (error) {
    providerContractLoadError = error instanceof Error ? error : new Error(String(error));
    return [];
  }
}

function createLazyArrayView<T>(load: () => T[]): T[] {
  return new Proxy([] as T[], {
    get(_target, prop) {
      const actual = load();
      const value = Reflect.get(actual, prop, actual);
      return typeof value === "function" ? value.bind(actual) : value;
    },
    has(_target, prop) {
      return Reflect.has(load(), prop);
    },
    ownKeys() {
      return Reflect.ownKeys(load());
    },
    getOwnPropertyDescriptor(_target, prop) {
      const actual = load();
      const descriptor = Reflect.getOwnPropertyDescriptor(actual, prop);
      if (descriptor) {
        return descriptor;
      }
      if (Reflect.has(actual, prop)) {
        return {
          configurable: true,
          enumerable: true,
          writable: false,
          value: Reflect.get(actual, prop, actual),
        };
      }
      return undefined;
    },
  });
}

let providerContractRegistryCache: ProviderContractEntry[] | null = null;
let webSearchProviderContractRegistryCache: WebSearchProviderContractEntry[] | null = null;
let speechProviderContractRegistryCache: SpeechProviderContractEntry[] | null = null;
let mediaUnderstandingProviderContractRegistryCache:
  | MediaUnderstandingProviderContractEntry[]
  | null = null;
let imageGenerationProviderContractRegistryCache: ImageGenerationProviderContractEntry[] | null =
  null;
let pluginRegistrationContractRegistryCache: PluginRegistrationContractEntry[] | null = null;
let providerRegistrationEntriesLoaded = false;

function loadProviderContractRegistry(): ProviderContractEntry[] {
  if (!providerContractRegistryCache) {
    providerContractRegistryCache = buildCapabilityContractRegistry({
      plugins: bundledProviderPlugins,
      select: (captured) => captured.providers,
    }).map((entry) => ({
      pluginId: entry.pluginId,
      provider: entry.provider,
    }));
  }
  if (!providerRegistrationEntriesLoaded) {
    const registrationEntries = loadPluginRegistrationContractRegistry();
    if (!providerRegistrationEntriesLoaded) {
      mergeProviderContractRegistrations(registrationEntries, providerContractRegistryCache);
      providerRegistrationEntriesLoaded = true;
    }
  }
  return providerContractRegistryCache;
}

function loadUniqueProviderContractProviders(): ProviderPlugin[] {
  return [
    ...new Map(
      loadProviderContractRegistry().map((entry) => [entry.provider.id, entry.provider]),
    ).values(),
  ];
}

function loadProviderContractPluginIds(): string[] {
  return [...new Set(loadProviderContractRegistry().map((entry) => entry.pluginId))].toSorted(
    (left, right) => left.localeCompare(right),
  );
}

function loadProviderContractCompatPluginIds(): string[] {
  return loadProviderContractPluginIds().map((pluginId) =>
    pluginId === "kimi-coding" ? "kimi" : pluginId,
  );
}

export const providerContractRegistry: ProviderContractEntry[] = createLazyArrayView(
  loadProviderContractRegistry,
);

export const uniqueProviderContractProviders: ProviderPlugin[] = createLazyArrayView(
  loadUniqueProviderContractProviders,
);

export const providerContractPluginIds: string[] = createLazyArrayView(
  loadProviderContractPluginIds,
);

export const providerContractCompatPluginIds: string[] = createLazyArrayView(
  loadProviderContractCompatPluginIds,
);

export function requireProviderContractProvider(providerId: string): ProviderPlugin {
  const provider = uniqueProviderContractProviders.find((entry) => entry.id === providerId);
  if (!provider) {
    if (!providerContractLoadError) {
      loadBundledProviderRegistry();
    }
    if (providerContractLoadError) {
      throw new Error(
        `provider contract entry missing for ${providerId}; bundled provider registry failed to load: ${providerContractLoadError.message}`,
      );
    }
    throw new Error(`provider contract entry missing for ${providerId}`);
  }
  return provider;
}

export function resolveProviderContractPluginIdsForProvider(
  providerId: string,
): string[] | undefined {
  const pluginIds = [
    ...new Set(
      providerContractRegistry
        .filter((entry) => entry.provider.id === providerId)
        .map((entry) => entry.pluginId),
    ),
  ];
  return pluginIds.length > 0 ? pluginIds : undefined;
}

export function resolveProviderContractProvidersForPluginIds(
  pluginIds: readonly string[],
): ProviderPlugin[] {
  const allowed = new Set(pluginIds);
  return [
    ...new Map(
      providerContractRegistry
        .filter((entry) => allowed.has(entry.pluginId))
        .map((entry) => [entry.provider.id, entry.provider]),
    ).values(),
  ];
}

function loadWebSearchProviderContractRegistry(): WebSearchProviderContractEntry[] {
  if (!webSearchProviderContractRegistryCache) {
    webSearchProviderContractRegistryCache = bundledWebSearchPlugins.flatMap((plugin) => {
      const captured = captureRegistrations(plugin);
      return captured.webSearchProviders.map((provider) => ({
        pluginId: plugin.id,
        provider,
        credentialValue: plugin.credentialValue,
      }));
    });
  }
  return webSearchProviderContractRegistryCache;
}

function loadSpeechProviderContractRegistry(): SpeechProviderContractEntry[] {
  if (!speechProviderContractRegistryCache) {
    speechProviderContractRegistryCache = buildCapabilityContractRegistry({
      plugins: bundledSpeechPlugins,
      select: (captured) => captured.speechProviders,
    });
  }
  return speechProviderContractRegistryCache;
}

function loadMediaUnderstandingProviderContractRegistry(): MediaUnderstandingProviderContractEntry[] {
  if (!mediaUnderstandingProviderContractRegistryCache) {
    mediaUnderstandingProviderContractRegistryCache = buildCapabilityContractRegistry({
      plugins: bundledMediaUnderstandingPlugins,
      select: (captured) => captured.mediaUnderstandingProviders,
    });
  }
  return mediaUnderstandingProviderContractRegistryCache;
}

function loadImageGenerationProviderContractRegistry(): ImageGenerationProviderContractEntry[] {
  if (!imageGenerationProviderContractRegistryCache) {
    imageGenerationProviderContractRegistryCache = buildCapabilityContractRegistry({
      plugins: bundledImageGenerationPlugins,
      select: (captured) => captured.imageGenerationProviders,
    });
  }
  return imageGenerationProviderContractRegistryCache;
}

export const webSearchProviderContractRegistry: WebSearchProviderContractEntry[] =
  createLazyArrayView(loadWebSearchProviderContractRegistry);

export const speechProviderContractRegistry: SpeechProviderContractEntry[] = createLazyArrayView(
  loadSpeechProviderContractRegistry,
);

export const mediaUnderstandingProviderContractRegistry: MediaUnderstandingProviderContractEntry[] =
  createLazyArrayView(loadMediaUnderstandingProviderContractRegistry);

export const imageGenerationProviderContractRegistry: ImageGenerationProviderContractEntry[] =
  createLazyArrayView(loadImageGenerationProviderContractRegistry);

const bundledProviderPlugins = dedupePlugins([
  amazonBedrockPlugin,
  anthropicPlugin,
  byteplusPlugin,
  chutesPlugin,
  cloudflareAiGatewayPlugin,
  copilotProxyPlugin,
  githubCopilotPlugin,
  falPlugin,
  googlePlugin,
  huggingFacePlugin,
  kilocodePlugin,
  kimiCodingPlugin,
  minimaxPlugin,
  mistralPlugin,
  modelStudioPlugin,
  moonshotPlugin,
  nvidiaPlugin,
  ollamaPlugin,
  openAIPlugin,
  opencodePlugin,
  opencodeGoPlugin,
  openrouterPlugin,
  qianfanPlugin,
  qwenPortalAuthPlugin,
  sglangPlugin,
  syntheticPlugin,
  togetherPlugin,
  venicePlugin,
  vercelAiGatewayPlugin,
  vllmPlugin,
  volcenginePlugin,
  xaiPlugin,
  xiaomiPlugin,
  zaiPlugin,
]);

const bundledPluginRegistrationList = dedupePlugins([
  ...bundledSpeechPlugins,
  ...bundledMediaUnderstandingPlugins,
  ...bundledImageGenerationPlugins,
  ...bundledWebSearchPlugins,
]);

function mergeIds(existing: string[], next: string[]): string[] {
  return next.length > 0 ? next : existing;
}

function upsertPluginRegistrationContractEntry(
  entries: PluginRegistrationContractEntry[],
  next: PluginRegistrationContractEntry,
): void {
  const existing = entries.find((entry) => entry.pluginId === next.pluginId);
  if (!existing) {
    entries.push(next);
    return;
  }
  existing.providerIds = mergeIds(existing.providerIds, next.providerIds);
  existing.speechProviderIds = mergeIds(existing.speechProviderIds, next.speechProviderIds);
  existing.mediaUnderstandingProviderIds = mergeIds(
    existing.mediaUnderstandingProviderIds,
    next.mediaUnderstandingProviderIds,
  );
  existing.imageGenerationProviderIds = mergeIds(
    existing.imageGenerationProviderIds,
    next.imageGenerationProviderIds,
  );
  existing.webSearchProviderIds = mergeIds(
    existing.webSearchProviderIds,
    next.webSearchProviderIds,
  );
  existing.toolNames = mergeIds(existing.toolNames, next.toolNames);
}

function mergeProviderContractRegistrations(
  registrationEntries: PluginRegistrationContractEntry[],
  providerEntries: ProviderContractEntry[],
): void {
  const byPluginId = new Map<string, string[]>();
  for (const entry of providerEntries) {
    const providerIds = byPluginId.get(entry.pluginId) ?? [];
    providerIds.push(entry.provider.id);
    byPluginId.set(entry.pluginId, providerIds);
  }
  for (const [pluginId, providerIds] of byPluginId) {
    upsertPluginRegistrationContractEntry(registrationEntries, {
      pluginId,
      providerIds: providerIds.toSorted((left, right) => left.localeCompare(right)),
      speechProviderIds: [],
      mediaUnderstandingProviderIds: [],
      imageGenerationProviderIds: [],
      webSearchProviderIds: [],
      toolNames: [],
    });
  }
}

function loadPluginRegistrationContractRegistry(): PluginRegistrationContractEntry[] {
  if (!pluginRegistrationContractRegistryCache) {
    const entries: PluginRegistrationContractEntry[] = [];
    for (const plugin of bundledPluginRegistrationList) {
      const captured = captureRegistrations(plugin);
      upsertPluginRegistrationContractEntry(entries, {
        pluginId: plugin.id,
        providerIds: captured.providers.map((provider) => provider.id),
        speechProviderIds: captured.speechProviders.map((provider) => provider.id),
        mediaUnderstandingProviderIds: captured.mediaUnderstandingProviders.map(
          (provider) => provider.id,
        ),
        imageGenerationProviderIds: captured.imageGenerationProviders.map(
          (provider) => provider.id,
        ),
        webSearchProviderIds: captured.webSearchProviders.map((provider) => provider.id),
        toolNames: captured.tools.map((tool) => tool.name),
      });
    }
    pluginRegistrationContractRegistryCache = entries;
  }
  if (providerContractRegistryCache && !providerRegistrationEntriesLoaded) {
    mergeProviderContractRegistrations(
      pluginRegistrationContractRegistryCache,
      providerContractRegistryCache,
    );
    providerRegistrationEntriesLoaded = true;
  }
  return pluginRegistrationContractRegistryCache;
}

export const pluginRegistrationContractRegistry: PluginRegistrationContractEntry[] =
  createLazyArrayView(loadPluginRegistrationContractRegistry);
