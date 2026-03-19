import { configSchema } from '../src/config/config-schema.ts';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let configPath = process.env.POWERDIRECTOR_CONFIG_PATH;

if (!configPath) {
  configPath = path.resolve(__dirname, '../powerdirector.config.json');
}

if (!fs.existsSync(configPath)) {
  console.error(`Config file not found at: ${configPath}`);
  process.exit(1);
}

try {
  const raw = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const result = configSchema.safeParse(raw);
  
  if (result.success) {
    console.log("Config is VALID against the current schema.");
  } else {
    console.error(`Config is INVALID at ${configPath}:`);
    result.error.issues.forEach(issue => {
      console.error(`- ${issue.path.join('.')}: ${issue.message}`);
    });
    process.exit(1);
  }
} catch (err) {
  console.error(`Error during validation: ${err.message}`);
  process.exit(1);
}
