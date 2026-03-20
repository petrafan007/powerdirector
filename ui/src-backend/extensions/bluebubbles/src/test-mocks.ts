import { vi } from "vitest";

vi.mock("./accounts", async () => {
  const { createBlueBubblesAccountsMockModule } = await import("./test-harness");
  return createBlueBubblesAccountsMockModule();
});

vi.mock("./probe", async () => {
  const { createBlueBubblesProbeMockModule } = await import("./test-harness");
  return createBlueBubblesProbeMockModule();
});
