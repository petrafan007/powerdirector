import type { Command } from "commander";
import type { PowerDirectorConfig } from "../../config/config";
import { isTruthyEnvValue } from "../../infra/env";
import { getPrimaryCommand, hasHelpOrVersion } from "../argv";
import { reparseProgramFromActionArgs } from "./action-reparse";
import { removeCommand, removeCommandByName } from "./command-tree";
import {
  getSubCliCommandsWithSubcommands,
  getSubCliEntries as getSubCliEntryDescriptors,
  type SubCliDescriptor,
} from "./subcli-descriptors";

export { getSubCliCommandsWithSubcommands };

type SubCliRegistrar = (program: Command) => Promise<void> | void;

type SubCliEntry = SubCliDescriptor & {
  register: SubCliRegistrar;
};

const shouldRegisterPrimaryOnly = (argv: string[]) => {
  if (isTruthyEnvValue(process.env.POWERDIRECTOR_DISABLE_LAZY_SUBCOMMANDS)) {
    return false;
  }
  if (hasHelpOrVersion(argv)) {
    return false;
  }
  return true;
};

const shouldEagerRegisterSubcommands = (_argv: string[]) => {
  return isTruthyEnvValue(process.env.POWERDIRECTOR_DISABLE_LAZY_SUBCOMMANDS);
};

export const loadValidatedConfigForPluginRegistration =
  async (): Promise<PowerDirectorConfig | null> => {
    const mod = await import("../../config/config");
    const snapshot = await mod.readConfigFileSnapshot();
    if (!snapshot.valid) {
      return null;
    }
    return mod.loadConfig();
  };

// Note for humans and agents:
// If you update the list of commands, also check whether they have subcommands
// and set the flag accordingly.
const entries: SubCliEntry[] = [
  {
    name: "acp",
    description: "Agent Control Protocol tools",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../acp-cli");
      mod.registerAcpCli(program);
    },
  },
  {
    name: "gateway",
    description: "Run, inspect, and query the WebSocket Gateway",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../gateway-cli");
      mod.registerGatewayCli(program);
    },
  },
  {
    name: "daemon",
    description: "Gateway service (legacy alias)",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../daemon-cli");
      mod.registerDaemonCli(program);
    },
  },
  {
    name: "logs",
    description: "Tail gateway file logs via RPC",
    hasSubcommands: false,
    register: async (program) => {
      const mod = await import("../logs-cli");
      mod.registerLogsCli(program);
    },
  },
  {
    name: "system",
    description: "System events, heartbeat, and presence",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../system-cli");
      mod.registerSystemCli(program);
    },
  },
  {
    name: "models",
    description: "Discover, scan, and configure models",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../models-cli");
      mod.registerModelsCli(program);
    },
  },
  {
    name: "approvals",
    description: "Manage exec approvals (gateway or node host)",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../exec-approvals-cli");
      mod.registerExecApprovalsCli(program);
    },
  },
  {
    name: "nodes",
    description: "Manage gateway-owned node pairing and node commands",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../nodes-cli");
      mod.registerNodesCli(program);
    },
  },
  {
    name: "devices",
    description: "Device pairing + token management",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../devices-cli");
      mod.registerDevicesCli(program);
    },
  },
  {
    name: "node",
    description: "Run and manage the headless node host service",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../node-cli");
      mod.registerNodeCli(program);
    },
  },
  {
    name: "sandbox",
    description: "Manage sandbox containers for agent isolation",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../sandbox-cli");
      mod.registerSandboxCli(program);
    },
  },
  {
    name: "tui",
    description: "Open a terminal UI connected to the Gateway",
    hasSubcommands: false,
    register: async (program) => {
      const mod = await import("../tui-cli");
      mod.registerTuiCli(program);
    },
  },
  {
    name: "cron",
    description: "Manage cron jobs via the Gateway scheduler",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../cron-cli");
      mod.registerCronCli(program);
    },
  },
  {
    name: "dns",
    description: "DNS helpers for wide-area discovery (Tailscale + CoreDNS)",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../dns-cli");
      mod.registerDnsCli(program);
    },
  },
  {
    name: "docs",
    description: "Search the live PowerDirector docs",
    hasSubcommands: false,
    register: async (program) => {
      const mod = await import("../docs-cli");
      mod.registerDocsCli(program);
    },
  },
  {
    name: "hooks",
    description: "Manage internal agent hooks",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../hooks-cli");
      mod.registerHooksCli(program);
    },
  },
  {
    name: "webhooks",
    description: "Webhook helpers and integrations",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../webhooks-cli");
      mod.registerWebhooksCli(program);
    },
  },
  {
    name: "qr",
    description: "Generate iOS pairing QR/setup code",
    hasSubcommands: false,
    register: async (program) => {
      const mod = await import("../qr-cli");
      mod.registerQrCli(program);
    },
  },
  {
    name: "clawbot",
    description: "Legacy clawbot command aliases",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../clawbot-cli");
      mod.registerClawbotCli(program);
    },
  },
  {
    name: "pairing",
    description: "Secure DM pairing (approve inbound requests)",
    hasSubcommands: true,
    register: async (program) => {
      // Initialize plugins before registering pairing CLI.
      // The pairing CLI calls listPairingChannels() at registration time,
      // which requires the plugin registry to be populated with channel plugins.
      const { registerPluginCliCommands } = await import("../../plugins/cli");
      const config = await loadValidatedConfigForPluginRegistration();
      if (config) {
        registerPluginCliCommands(program, config);
      }
      const mod = await import("../pairing-cli");
      mod.registerPairingCli(program);
    },
  },
  {
    name: "plugins",
    description: "Manage PowerDirector plugins and extensions",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../plugins-cli");
      mod.registerPluginsCli(program);
      const { registerPluginCliCommands } = await import("../../plugins/cli");
      const config = await loadValidatedConfigForPluginRegistration();
      if (config) {
        registerPluginCliCommands(program, config);
      }
    },
  },
  {
    name: "channels",
    description: "Manage connected chat channels (Telegram, Discord, etc.)",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../channels-cli");
      mod.registerChannelsCli(program);
    },
  },
  {
    name: "directory",
    description: "Lookup contact and group IDs (self, peers, groups) for supported chat channels",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../directory-cli");
      mod.registerDirectoryCli(program);
    },
  },
  {
    name: "security",
    description: "Security tools and local config audits",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../security-cli");
      mod.registerSecurityCli(program);
    },
  },
  {
    name: "secrets",
    description: "Secrets runtime reload controls",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../secrets-cli");
      mod.registerSecretsCli(program);
    },
  },
  {
    name: "skills",
    description: "List and inspect available skills",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../skills-cli");
      mod.registerSkillsCli(program);
    },
  },
  {
    name: "update",
    description: "Update PowerDirector and inspect update channel status",
    hasSubcommands: true,
    register: async (program) => {
      const mod = await import("../update-cli");
      mod.registerUpdateCli(program);
    },
  },
  {
    name: "completion",
    description: "Generate shell completion script",
    hasSubcommands: false,
    register: async (program) => {
      const mod = await import("../completion-cli");
      mod.registerCompletionCli(program);
    },
  },
];

export function getSubCliEntries(): ReadonlyArray<SubCliDescriptor> {
  return getSubCliEntryDescriptors();
}

export async function registerSubCliByName(program: Command, name: string): Promise<boolean> {
  const entry = entries.find((candidate) => candidate.name === name);
  if (!entry) {
    return false;
  }
  removeCommandByName(program, entry.name);
  await entry.register(program);
  return true;
}

function registerLazyCommand(program: Command, entry: SubCliEntry) {
  const placeholder = program.command(entry.name).description(entry.description);
  placeholder.allowUnknownOption(true);
  placeholder.allowExcessArguments(true);
  placeholder.action(async (...actionArgs) => {
    removeCommand(program, placeholder);
    await entry.register(program);
    await reparseProgramFromActionArgs(program, actionArgs);
  });
}

export function registerSubCliCommands(program: Command, argv: string[] = process.argv) {
  if (shouldEagerRegisterSubcommands(argv)) {
    for (const entry of entries) {
      void entry.register(program);
    }
    return;
  }
  const primary = getPrimaryCommand(argv);
  if (primary && shouldRegisterPrimaryOnly(argv)) {
    const entry = entries.find((candidate) => candidate.name === primary);
    if (entry) {
      registerLazyCommand(program, entry);
      return;
    }
  }
  for (const candidate of entries) {
    registerLazyCommand(program, candidate);
  }
}
