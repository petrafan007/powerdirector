import fs from "node:fs/promises";
import path from "node:path";
import { resolvePowerDirectorAgentDir } from "./agent-paths";

export async function readGeneratedModelsJson<T>(): Promise<T> {
  const modelPath = path.join(resolvePowerDirectorAgentDir(), "models.json");
  const raw = await fs.readFile(modelPath, "utf8");
  return JSON.parse(raw) as T;
}
