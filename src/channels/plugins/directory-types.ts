import type { PowerDirectorConfig } from "../../config/types.js";

export type DirectoryConfigParams = {
  cfg: PowerDirectorConfig;
  accountId?: string | null;
  query?: string | null;
  limit?: number | null;
};
