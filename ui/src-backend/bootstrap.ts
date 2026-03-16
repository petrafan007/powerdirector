import { loadDotEnv } from "./infra/dotenv.js";

// Load environment variables from .env immediately before any other module initialization.
loadDotEnv({ quiet: true });
