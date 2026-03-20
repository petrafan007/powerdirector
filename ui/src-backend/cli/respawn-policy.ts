import { hasHelpOrVersion } from "./argv";

export function shouldSkipRespawnForArgv(argv: string[]): boolean {
  return hasHelpOrVersion(argv);
}
