import { acpConfiguredBindingConsumer } from "./acp-configured-binding-consumer";
import {
  registerConfiguredBindingConsumer,
  unregisterConfiguredBindingConsumer,
} from "./configured-binding-consumers";

export function ensureConfiguredBindingBuiltinsRegistered(): void {
  registerConfiguredBindingConsumer(acpConfiguredBindingConsumer);
}

export function resetConfiguredBindingBuiltinsForTesting(): void {
  unregisterConfiguredBindingConsumer(acpConfiguredBindingConsumer.id);
}
