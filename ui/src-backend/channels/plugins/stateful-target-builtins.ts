import { acpStatefulBindingTargetDriver } from "./acp-stateful-target-driver";
import {
  registerStatefulBindingTargetDriver,
  unregisterStatefulBindingTargetDriver,
} from "./stateful-target-drivers";

export function ensureStatefulTargetBuiltinsRegistered(): void {
  registerStatefulBindingTargetDriver(acpStatefulBindingTargetDriver);
}

export function resetStatefulTargetBuiltinsForTesting(): void {
  unregisterStatefulBindingTargetDriver(acpStatefulBindingTargetDriver.id);
}
