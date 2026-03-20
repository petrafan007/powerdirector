import { z } from "zod";
import { buildChannelConfigSchema } from "../api";

export const SynologyChatChannelConfigSchema = buildChannelConfigSchema(z.object({}).passthrough());
