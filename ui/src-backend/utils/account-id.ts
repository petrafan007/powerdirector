import { normalizeOptionalAccountId } from "../routing/account-id";

export function normalizeAccountId(value?: string): string | undefined {
  return normalizeOptionalAccountId(value);
}
