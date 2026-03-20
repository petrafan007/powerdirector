import { definePluginEntry } from "@/src-backend/plugin-sdk/core";
import { createBraveWebSearchProvider } from "./src/brave-web-search-provider";

export default definePluginEntry({
  id: "brave",
  name: "Brave Plugin",
  description: "Bundled Brave plugin",
  register(api) {
    api.registerWebSearchProvider(createBraveWebSearchProvider());
  },
});
