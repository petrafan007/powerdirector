import { definePluginEntry, type AnyAgentTool } from "powerdirector/plugin-sdk/core";
import { createFirecrawlScrapeTool } from "./src/firecrawl-scrape-tool";
import { createFirecrawlWebSearchProvider } from "./src/firecrawl-search-provider";
import { createFirecrawlSearchTool } from "./src/firecrawl-search-tool";

export default definePluginEntry({
  id: "firecrawl",
  name: "Firecrawl Plugin",
  description: "Bundled Firecrawl search and scrape plugin",
  register(api) {
    api.registerWebSearchProvider(createFirecrawlWebSearchProvider());
    api.registerTool(createFirecrawlSearchTool(api) as AnyAgentTool);
    api.registerTool(createFirecrawlScrapeTool(api) as AnyAgentTool);
  },
});
