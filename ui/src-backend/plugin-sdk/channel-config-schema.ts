/** Shared config-schema primitives for channel plugins with DM/group policy knobs. */
export {
  AllowFromListSchema,
  buildChannelConfigSchema,
  buildCatchallMultiAccountChannelSchema,
  buildNestedDmConfigSchema,
} from "../channels/plugins/config-schema";
export {
  DmPolicySchema,
  GroupPolicySchema,
  MarkdownConfigSchema,
} from "../config/zod-schema.core";
export { ToolPolicySchema } from "../config/zod-schema.agent-runtime";
