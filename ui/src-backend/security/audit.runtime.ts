import { runSecurityAudit as runSecurityAuditImpl } from "./audit";

type RunSecurityAudit = typeof import("./audit").runSecurityAudit;

export function runSecurityAudit(
  ...args: Parameters<RunSecurityAudit>
): ReturnType<RunSecurityAudit> {
  return runSecurityAuditImpl(...args);
}
