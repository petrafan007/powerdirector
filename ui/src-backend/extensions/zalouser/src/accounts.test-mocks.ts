import { vi } from "vitest";
import { createDefaultResolvedZalouserAccount } from "./test-helpers";

vi.mock("./accounts", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    resolveZalouserAccountSync: () => createDefaultResolvedZalouserAccount(),
  };
});
