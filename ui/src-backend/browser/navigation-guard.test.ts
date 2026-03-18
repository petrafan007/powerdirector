import { describe, expect, it, vi } from "vitest";
import { SsrFBlockedError, type LookupFn } from '../infra/net/ssrf';
import {
  assertBrowserNavigationAllowed,
  assertBrowserNavigationRedirectChainAllowed,
  assertBrowserNavigationResultAllowed,
  InvalidBrowserNavigationUrlError,
  requiresInspectableBrowserNavigationRedirects,
} from './navigation-guard';

function createLookupFn(address: string): LookupFn {
  const family = address.includes(":") ? 6 : 4;
  return vi.fn(async () => [{ address, family }]) as unknown as LookupFn;
}

describe("browser navigation guard", () => {
  it("blocks private loopback URLs by default", async () => {
    await expect(
      assertBrowserNavigationAllowed({
        url: "http://127.0.0.1:8080",
      }),
    ).rejects.toBeInstanceOf(SsrFBlockedError);
  });

  it("allows non-network schemes", async () => {
    await expect(
      assertBrowserNavigationAllowed({
        url: "about:blank",
      }),
    ).resolves.toBeUndefined();
  });

  it("allows blocked hostnames when explicitly allowed", async () => {
    const lookupFn = createLookupFn("127.0.0.1");
    await expect(
      assertBrowserNavigationAllowed({
        url: "http://agent.internal:3000",
        ssrfPolicy: {
          allowedHostnames: ["agent.internal"],
        },
        lookupFn,
      }),
    ).resolves.toBeUndefined();
    expect(lookupFn).toHaveBeenCalledWith("agent.internal", { all: true });
  });

  it("blocks hostnames that resolve to private addresses by default", async () => {
    const lookupFn = createLookupFn("127.0.0.1");
    await expect(
      assertBrowserNavigationAllowed({
        url: "https://example.com",
        lookupFn,
      }),
    ).rejects.toBeInstanceOf(SsrFBlockedError);
  });

  it("allows hostnames that resolve to public addresses", async () => {
    const lookupFn = createLookupFn("93.184.216.34");
    await expect(
      assertBrowserNavigationAllowed({
        url: "https://example.com",
        lookupFn,
      }),
    ).resolves.toBeUndefined();
    expect(lookupFn).toHaveBeenCalledWith("example.com", { all: true });
  });

  it("rejects invalid URLs", async () => {
    await expect(
      assertBrowserNavigationAllowed({
        url: "not a url",
      }),
    ).rejects.toBeInstanceOf(InvalidBrowserNavigationUrlError);
  });

  it("allows about:blank as a non-network result URL", async () => {
    await expect(
      assertBrowserNavigationResultAllowed({
        url: "about:blank",
      }),
    ).resolves.toBeUndefined();
  });

  it("blocks private intermediate redirect hops", async () => {
    const publicLookup = createLookupFn("93.184.216.34");
    const privateLookup = createLookupFn("127.0.0.1");
    const finalRequest = {
      url: () => "https://public.example/final",
      redirectedFrom: () => ({
        url: () => "http://private.example/internal",
        redirectedFrom: () => ({
          url: () => "https://public.example/start",
          redirectedFrom: () => null,
        }),
      }),
    };

    await expect(
      assertBrowserNavigationRedirectChainAllowed({
        request: finalRequest,
        lookupFn: vi.fn(async (hostname: string) =>
          hostname === "private.example"
            ? privateLookup(hostname, { all: true })
            : publicLookup(hostname, { all: true }),
        ) as unknown as LookupFn,
      }),
    ).rejects.toBeInstanceOf(SsrFBlockedError);
  });

  it("allows redirect chains when each hop resolves publicly", async () => {
    const lookupFn = createLookupFn("93.184.216.34");
    const finalRequest = {
      url: () => "https://public.example/final",
      redirectedFrom: () => ({
        url: () => "https://public.example/middle",
        redirectedFrom: () => ({
          url: () => "https://public.example/start",
          redirectedFrom: () => null,
        }),
      }),
    };

    await expect(
      assertBrowserNavigationRedirectChainAllowed({
        request: finalRequest,
        lookupFn,
      }),
    ).resolves.toBeUndefined();
  });

  it("requires redirect-hop inspection unless private-network navigation is enabled", () => {
    expect(requiresInspectableBrowserNavigationRedirects()).toBe(true);
    expect(requiresInspectableBrowserNavigationRedirects({ allowPrivateNetwork: true })).toBe(
      false,
    );
  });
});
