import { describe, expect, it } from "vitest";
import { shortenText } from "./text-format.js";

describe("shortenText", () => {
  it("returns original text when it fits", () => {
    expect(shortenText("powerdirector", 16)).toBe("powerdirector");
  });

  it("truncates and appends ellipsis when over limit", () => {
    expect(shortenText("powerdirector-status-output", 10)).toBe("powerdirector-…");
  });

  it("counts multi-byte characters correctly", () => {
    expect(shortenText("hello🙂world", 7)).toBe("hello🙂…");
  });
});
