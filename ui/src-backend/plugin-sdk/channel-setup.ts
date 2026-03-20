import type { ChannelSetupWizard } from "../channels/plugins/setup-wizard";
import type { ChannelSetupAdapter } from "../channels/plugins/types.adapters";
import {
  createOptionalChannelSetupAdapter,
  createOptionalChannelSetupWizard,
} from "./optional-channel-setup";

export type { ChannelSetupAdapter } from "../channels/plugins/types.adapters";
export type { ChannelSetupDmPolicy, ChannelSetupWizard } from "./setup";
export {
  DEFAULT_ACCOUNT_ID,
  createTopLevelChannelDmPolicy,
  formatDocsLink,
  setSetupChannelEnabled,
  splitSetupEntries,
} from "./setup";

type OptionalChannelSetupParams = {
  channel: string;
  label: string;
  npmSpec?: string;
  docsPath?: string;
};

export type OptionalChannelSetupSurface = {
  setupAdapter: ChannelSetupAdapter;
  setupWizard: ChannelSetupWizard;
};

export {
  createOptionalChannelSetupAdapter,
  createOptionalChannelSetupWizard,
} from "./optional-channel-setup";

export function createOptionalChannelSetupSurface(
  params: OptionalChannelSetupParams,
): OptionalChannelSetupSurface {
  return {
    setupAdapter: createOptionalChannelSetupAdapter(params),
    setupWizard: createOptionalChannelSetupWizard(params),
  };
}
