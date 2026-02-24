// @ts-nocheck
export type SsrFPolicy = {
  allowPrivateNetwork?: boolean;
  allowLoopback?: boolean;
};

export type LookupFn = (hostname: string) => Promise<string[]>;
