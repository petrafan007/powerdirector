import { vi } from "vitest";

vi.mock("./doctor-completion", () => ({
  doctorShellCompletion: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./doctor-bootstrap-size", () => ({
  noteBootstrapFileSize: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./doctor-browser", () => ({
  noteChromeMcpBrowserReadiness: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./doctor-gateway-daemon-flow", () => ({
  maybeRepairGatewayDaemon: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./doctor-gateway-health", () => ({
  checkGatewayHealth: vi.fn().mockResolvedValue({ healthOk: false }),
  probeGatewayMemoryStatus: vi.fn().mockResolvedValue({ checked: false, ready: false }),
}));

vi.mock("./doctor-memory-search", () => ({
  noteMemorySearchHealth: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./doctor-platform-notes", () => ({
  noteDeprecatedLegacyEnvVars: vi.fn(),
  noteStartupOptimizationHints: vi.fn(),
  noteMacLaunchAgentOverrides: vi.fn().mockResolvedValue(undefined),
  noteMacLaunchctlGatewayEnvOverrides: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./doctor-sandbox", () => ({
  maybeRepairSandboxImages: vi.fn(async (cfg: unknown) => cfg),
  noteSandboxScopeWarnings: vi.fn(),
}));

vi.mock("./doctor-security", () => ({
  noteSecurityWarnings: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./doctor-session-locks", () => ({
  noteSessionLockHealth: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./doctor-state-integrity", () => ({
  noteStateIntegrity: vi.fn().mockResolvedValue(undefined),
  noteWorkspaceBackupTip: vi.fn(),
}));

vi.mock("./doctor-ui", () => ({
  maybeRepairUiProtocolFreshness: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./doctor-workspace-status", () => ({
  noteWorkspaceStatus: vi.fn(),
}));

vi.mock("./oauth-tls-preflight", () => ({
  noteOpenAIOAuthTlsPrerequisites: vi.fn().mockResolvedValue(undefined),
}));
