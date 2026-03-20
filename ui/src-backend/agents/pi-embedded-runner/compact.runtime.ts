import { compactEmbeddedPiSessionDirect as compactEmbeddedPiSessionDirectImpl } from "./compact";

type CompactEmbeddedPiSessionDirect = typeof import("./compact").compactEmbeddedPiSessionDirect;

export function compactEmbeddedPiSessionDirect(
  ...args: Parameters<CompactEmbeddedPiSessionDirect>
): ReturnType<CompactEmbeddedPiSessionDirect> {
  return compactEmbeddedPiSessionDirectImpl(...args);
}
