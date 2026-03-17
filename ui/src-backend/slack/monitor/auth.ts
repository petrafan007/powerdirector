import { readChannelAllowFromStore } from '../../pairing/pairing-store';
import { allowListMatches, normalizeAllowList, normalizeAllowListLower } from './allow-list';
import type { SlackMonitorContext } from './context';

export async function resolveSlackEffectiveAllowFrom(ctx: SlackMonitorContext) {
  const storeAllowFrom = await readChannelAllowFromStore("slack").catch(() => []);
  const allowFrom = normalizeAllowList([...ctx.allowFrom, ...storeAllowFrom]);
  const allowFromLower = normalizeAllowListLower(allowFrom);
  return { allowFrom, allowFromLower };
}

export function isSlackSenderAllowListed(params: {
  allowListLower: string[];
  senderId: string;
  senderName?: string;
}) {
  const { allowListLower, senderId, senderName } = params;
  return (
    allowListLower.length === 0 ||
    allowListMatches({
      allowList: allowListLower,
      id: senderId,
      name: senderName,
    })
  );
}
