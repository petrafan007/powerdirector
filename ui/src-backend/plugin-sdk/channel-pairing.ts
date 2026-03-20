import type { ChannelId } from "../channels/plugins/types";
import { issuePairingChallenge } from "../pairing/pairing-challenge";
import type { PluginRuntime } from "../plugins/runtime/types";
import { createScopedPairingAccess } from "./pairing-access";

type ScopedPairingAccess = ReturnType<typeof createScopedPairingAccess>;

export type ChannelPairingController = ScopedPairingAccess & {
  issueChallenge: (
    params: Omit<Parameters<typeof issuePairingChallenge>[0], "channel" | "upsertPairingRequest">,
  ) => ReturnType<typeof issuePairingChallenge>;
};

export function createChannelPairingChallengeIssuer(params: {
  channel: ChannelId;
  upsertPairingRequest: Parameters<typeof issuePairingChallenge>[0]["upsertPairingRequest"];
}) {
  return (
    challenge: Omit<
      Parameters<typeof issuePairingChallenge>[0],
      "channel" | "upsertPairingRequest"
    >,
  ) =>
    issuePairingChallenge({
      channel: params.channel,
      upsertPairingRequest: params.upsertPairingRequest,
      ...challenge,
    });
}

export function createChannelPairingController(params: {
  core: PluginRuntime;
  channel: ChannelId;
  accountId: string;
}): ChannelPairingController {
  const access = createScopedPairingAccess(params);
  return {
    ...access,
    issueChallenge: createChannelPairingChallengeIssuer({
      channel: params.channel,
      upsertPairingRequest: access.upsertPairingRequest,
    }),
  };
}
