import { pruneStaleCommandPolls as pruneStaleCommandPollsImpl } from "./command-poll-backoff";

type PruneStaleCommandPolls = typeof import("./command-poll-backoff").pruneStaleCommandPolls;

export function pruneStaleCommandPolls(
  ...args: Parameters<PruneStaleCommandPolls>
): ReturnType<PruneStaleCommandPolls> {
  return pruneStaleCommandPollsImpl(...args);
}
