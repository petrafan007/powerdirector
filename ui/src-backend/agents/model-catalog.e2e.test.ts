import { describe, expect, it } from "vitest";
import type { PowerDirectorConfig } from '../config/config';
import { loadModelCatalog } from './model-catalog';
import {
  installModelCatalogTestHooks,
  mockCatalogImportFailThenRecover,
} from './model-catalog.test-harness';

describe("loadModelCatalog e2e smoke", () => {
  installModelCatalogTestHooks();

  it("recovers after an import failure on the next load", async () => {
    mockCatalogImportFailThenRecover();

    const cfg = {} as PowerDirectorConfig;
    expect(await loadModelCatalog({ config: cfg })).toEqual([]);
    expect(await loadModelCatalog({ config: cfg })).toEqual([
      { id: "gpt-4.1", name: "GPT-4.1", provider: "openai" },
    ]);
  });
});
