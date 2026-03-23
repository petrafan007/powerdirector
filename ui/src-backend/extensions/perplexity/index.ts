import { definePluginEntry } from "powerdirector/plugin-sdk/core";
import { createPerplexityWebSearchProvider } from "./src/perplexity-web-search-provider";

export default definePluginEntry({
  id: "perplexity",
  name: "Perplexity Plugin",
  description: "Bundled Perplexity plugin",
  register(api) {
    api.registerWebSearchProvider(createPerplexityWebSearchProvider());
  },
});
