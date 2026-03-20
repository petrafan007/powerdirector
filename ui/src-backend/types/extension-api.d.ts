declare module "../../../dist/extensionAPI" {
  export const runEmbeddedPiAgent: (params: Record<string, unknown>) => Promise<unknown>;
}
