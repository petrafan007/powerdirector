// @ts-nocheck
import { formatChangesDate } from './utils';

export async function fetchGroupChanges(
  api: { scry: (path: string) => Promise<unknown> },
  logger: { log: (msg: string) => void },
  daysAgo = 5,
) {
  try {
    const changeDate = formatChangesDate(daysAgo);
    logger.log(`[tlon] Fetching group changes since ${daysAgo} days ago (${changeDate})...`);
    const changes = await api.scry(`/groups-ui/v5/changes/${changeDate}.json`);
    if (changes) {
      logger.log("[tlon] Successfully fetched changes data");
      return changes;
    }
    return null;
  } catch (error) {
    logger.log(
      `[tlon] Failed to fetch changes (falling back to full init): ${(error as { message?: string })?.message ?? String(error)}`,
    );
    return null;
  }
}

export async function fetchAllChannels(
  api: { scry: (path: string) => Promise<unknown> },
  logger: { log: (msg: string) => void },
): Promise<string[]> {
  try {
    logger.log("[tlon] Attempting auto-discovery of group channels...");
    const changes = await fetchGroupChanges(api, logger, 5);

    let initData: any;
    if (changes) {
      logger.log("[tlon] Changes data received, using full init for channel extraction");
      initData = await api.scry("/groups-ui/v6/init.json");
    } else {
      initData = await api.scry("/groups-ui/v6/init.json");
    }

    const channels: string[] = [];
    if (initData && initData.groups) {
      for (const groupData of Object.values(initData.groups as Record<string, any>)) {
        if (groupData && typeof groupData === "object" && groupData.channels) {
          for (const channelNest of Object.keys(groupData.channels)) {
            if (channelNest.startsWith("chat/")) {
              channels.push(channelNest);
            }
          }
        }
      }
    }

    if (channels.length > 0) {
      logger.log(`[tlon] Auto-discovered ${channels.length} chat channel(s)`);
      logger.log(
        `[tlon] Channels: ${channels.slice(0, 5).join(", ")}${channels.length > 5 ? "..." : ""}`,
      );
    } else {
      logger.log("[tlon] No chat channels found via auto-discovery");
      logger.log("[tlon] Add channels manually to config: channels.tlon.groupChannels");
    }

    return channels;
  } catch (error) {
    logger.log(
      `[tlon] Auto-discovery failed: ${(error as { message?: string })?.message ?? String(error)}`,
    );
    logger.log(
      "[tlon] To monitor group channels, add them to config: channels.tlon.groupChannels",
    );
    logger.log('[tlon] Example: ["chat/~host-ship/channel-name"]');
    return [];
  }
}
