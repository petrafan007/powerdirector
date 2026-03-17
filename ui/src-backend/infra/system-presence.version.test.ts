import { describe, expect, it, vi } from "vitest";
import { withEnvAsync } from '../test-utils/env';

async function withPresenceModule<T>(
  env: Record<string, string | undefined>,
  run: (module: typeof import('./system-presence')) => Promise<T> | T,
): Promise<T> {
  return withEnvAsync(env, async () => {
    vi.resetModules();
    try {
      const module = await import('./system-presence');
      return await run(module);
    } finally {
      vi.resetModules();
    }
  });
}

describe("system-presence version fallback", () => {
  it("uses POWERDIRECTOR_SERVICE_VERSION when POWERDIRECTOR_VERSION is not set", async () => {
    await withPresenceModule(
      {
        POWERDIRECTOR_SERVICE_VERSION: "2.4.6-service",
        npm_package_version: "1.0.0-package",
      },
      ({ listSystemPresence }) => {
        const selfEntry = listSystemPresence().find((entry) => entry.reason === "self");
        expect(selfEntry?.version).toBe("2.4.6-service");
      },
    );
  });

  it("prefers POWERDIRECTOR_VERSION over POWERDIRECTOR_SERVICE_VERSION", async () => {
    await withPresenceModule(
      {
        POWERDIRECTOR_VERSION: "9.9.9-cli",
        POWERDIRECTOR_SERVICE_VERSION: "2.4.6-service",
        npm_package_version: "1.0.0-package",
      },
      ({ listSystemPresence }) => {
        const selfEntry = listSystemPresence().find((entry) => entry.reason === "self");
        expect(selfEntry?.version).toBe("9.9.9-cli");
      },
    );
  });

  it("uses npm_package_version when POWERDIRECTOR_VERSION and POWERDIRECTOR_SERVICE_VERSION are blank", async () => {
    await withPresenceModule(
      {
        POWERDIRECTOR_VERSION: " ",
        POWERDIRECTOR_SERVICE_VERSION: "\t",
        npm_package_version: "1.0.0-package",
      },
      ({ listSystemPresence }) => {
        const selfEntry = listSystemPresence().find((entry) => entry.reason === "self");
        expect(selfEntry?.version).toBe("1.0.0-package");
      },
    );
  });
});
