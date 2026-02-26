import { loadDotEnv } from './infra/dotenv';

// Load environment variables from .env immediately before any other module initialization.
loadDotEnv({ quiet: true });
