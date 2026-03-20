import { requestHeartbeatNow } from "../../infra/heartbeat-wake";
import { enqueueSystemEvent } from "../../infra/system-events";
import { runCommandWithTimeout } from "../../process/exec";
import { formatNativeDependencyHint } from "./native-deps";
import type { PluginRuntime } from "./types";

export function createRuntimeSystem(): PluginRuntime["system"] {
  return {
    enqueueSystemEvent,
    requestHeartbeatNow,
    runCommandWithTimeout,
    formatNativeDependencyHint,
  };
}
