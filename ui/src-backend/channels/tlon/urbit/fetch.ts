// @ts-nocheck
import { validateUrbitBaseUrl } from './base-url';
import { UrbitUrlError } from './errors';

export type UrbitFetchOptions = {
  baseUrl: string;
  path: string;
  init?: RequestInit;
  timeoutMs?: number;
  auditContext?: string;
  signal?: AbortSignal;
};

export async function urbitFetch(params: UrbitFetchOptions) {
  const validated = validateUrbitBaseUrl(params.baseUrl);
  if (!validated.ok) {
    throw new UrbitUrlError(validated.error);
  }

  const url = new URL(params.path, validated.baseUrl).toString();
  const controller = new AbortController();
  const timeout = params.timeoutMs ?? 30000;
  const id = setTimeout(() => controller.abort(), timeout);

  // If a signal is provided, link it to our controller
  if (params.signal) {
    params.signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const response = await fetch(url, {
      ...params.init,
      signal: controller.signal,
    });
    return {
      response,
      release: async () => {}, // No-op for standard fetch, kept for API compatibility
    };
  } finally {
    clearTimeout(id);
  }
}
