import { describe, expect, it } from "vitest";

import { SECTION_GROUPS } from "../ui/app/config/definitions";
import {
  isSectionName,
  normalizeSectionName,
  SECTION_NAMES,
} from "../src/config/config-schema";

describe("config section registry", () => {
  it("covers every config section surfaced by the Control UI", () => {
    const sectionIds = SECTION_GROUPS.flatMap((group) => group.sections.map((section) => section.id));
    expect(SECTION_NAMES).toEqual(expect.arrayContaining(sectionIds));
    expect(sectionIds.every((id) => isSectionName(id))).toBe(true);
  });

  it("normalizes legacy section aliases to canonical section names", () => {
    expect(normalizeSectionName("environment")).toBe("env");
    expect(normalizeSectionName("setupWizard")).toBe("wizard");
    expect(normalizeSectionName("updates")).toBe("update");
    expect(normalizeSectionName("authentication")).toBe("auth");
    expect(normalizeSectionName("plugins")).toBe("plugins");
    expect(isSectionName(normalizeSectionName("environment"))).toBe(true);
  });
});
