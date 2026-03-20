import { createChannelRegistryLoader } from "./registry-loader";
import type { ChannelId, ChannelPlugin } from "./types";

const loadPluginFromRegistry = createChannelRegistryLoader<ChannelPlugin>((entry) => entry.plugin);

export async function loadChannelPlugin(id: ChannelId): Promise<ChannelPlugin | undefined> {
  return loadPluginFromRegistry(id);
}
