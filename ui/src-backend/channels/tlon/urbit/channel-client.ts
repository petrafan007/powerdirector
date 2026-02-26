// @ts-nocheck
import { ensureUrbitChannelOpen, pokeUrbitChannel, scryUrbitPath } from './channel-ops';
import { getUrbitContext, normalizeUrbitCookie } from './context';
import { urbitFetch } from './fetch';

export type UrbitChannelClientOptions = {
  ship?: string;
};

export class UrbitChannelClient {
  readonly baseUrl: string;
  readonly cookie: string;
  readonly ship: string;

  private channelId: string | null = null;

  constructor(url: string, cookie: string, options: UrbitChannelClientOptions = {}) {
    const ctx = getUrbitContext(url, options.ship);
    this.baseUrl = ctx.baseUrl;
    this.cookie = normalizeUrbitCookie(cookie);
    this.ship = ctx.ship;
  }

  private get channelPath(): string {
    const id = this.channelId;
    if (!id) {
      throw new Error("Channel not opened");
    }
    return `/~/channel/${id}`;
  }

  async open(): Promise<void> {
    if (this.channelId) {
      return;
    }

    const channelId = `${Math.floor(Date.now() / 1000)}-${Math.random().toString(36).substring(2, 8)}`;
    this.channelId = channelId;

    try {
      await ensureUrbitChannelOpen(
        {
          baseUrl: this.baseUrl,
          cookie: this.cookie,
          ship: this.ship,
          channelId,
        },
        {
          createBody: [],
          createAuditContext: "tlon-urbit-channel-open",
        },
      );
    } catch (error) {
      this.channelId = null;
      throw error;
    }
  }

  async poke(params: { app: string; mark: string; json: unknown }): Promise<number> {
    await this.open();
    const channelId = this.channelId;
    if (!channelId) {
      throw new Error("Channel not opened");
    }
    return await pokeUrbitChannel(
      {
        baseUrl: this.baseUrl,
        cookie: this.cookie,
        ship: this.ship,
        channelId,
      },
      { ...params, auditContext: "tlon-urbit-poke" },
    );
  }

  async scry(path: string): Promise<unknown> {
    return await scryUrbitPath(
      {
        baseUrl: this.baseUrl,
        cookie: this.cookie,
      },
      { path, auditContext: "tlon-urbit-scry" },
    );
  }

  async getOurName(): Promise<string> {
    const { response, release } = await urbitFetch({
      baseUrl: this.baseUrl,
      path: "/~/name",
      init: {
        method: "GET",
        headers: { Cookie: this.cookie },
      },
      timeoutMs: 30_000,
      auditContext: "tlon-urbit-name",
    });

    try {
      if (!response.ok) {
        throw new Error(`Name request failed: ${response.status}`);
      }
      const text = await response.text();
      return text.trim();
    } finally {
      await release();
    }
  }

  async close(): Promise<void> {
    if (!this.channelId) {
      return;
    }
    const channelPath = this.channelPath;
    this.channelId = null;

    try {
      const { response, release } = await urbitFetch({
        baseUrl: this.baseUrl,
        path: channelPath,
        init: { method: "DELETE", headers: { Cookie: this.cookie } },
        timeoutMs: 30_000,
        auditContext: "tlon-urbit-channel-close",
      });
      try {
        void response.body?.cancel();
      } finally {
        await release();
      }
    } catch {
      // ignore cleanup errors
    }
  }
}
