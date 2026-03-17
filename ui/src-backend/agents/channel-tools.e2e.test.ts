import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ChannelPlugin } from '../channels/plugins/types';
import type { PowerDirectorConfig } from '../config/config';
import { setActivePluginRegistry } from '../plugins/runtime';
import { defaultRuntime } from '../runtime';
import { createTestRegistry } from '../test-utils/channel-plugins';
import { __testing, listAllChannelSupportedActions } from './channel-tools';

describe("channel tools", () => {
  const errorSpy = vi.spyOn(defaultRuntime, "error").mockImplementation(() => undefined);

  beforeEach(() => {
    const plugin: ChannelPlugin = {
      id: "test",
      meta: {
        id: "test",
        label: "Test",
        selectionLabel: "Test",
        docsPath: "/channels/test",
        blurb: "test plugin",
      },
      capabilities: { chatTypes: ["direct"] },
      config: {
        listAccountIds: () => [],
        resolveAccount: () => ({}),
      },
      actions: {
        listActions: () => {
          throw new Error("boom");
        },
      },
    };

    __testing.resetLoggedListActionErrors();
    errorSpy.mockClear();
    setActivePluginRegistry(createTestRegistry([{ pluginId: "test", source: "test", plugin }]));
  });

  afterEach(() => {
    setActivePluginRegistry(createTestRegistry([]));
    errorSpy.mockClear();
  });

  it("skips crashing plugins and logs once", () => {
    const cfg = {} as PowerDirectorConfig;
    expect(listAllChannelSupportedActions({ cfg })).toEqual([]);
    expect(errorSpy).toHaveBeenCalledTimes(1);

    expect(listAllChannelSupportedActions({ cfg })).toEqual([]);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
