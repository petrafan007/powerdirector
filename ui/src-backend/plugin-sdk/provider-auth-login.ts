// Public interactive auth/login helpers for provider plugins.

import { createLazyRuntimeMethodBinder, createLazyRuntimeModule } from "../shared/lazy-runtime";

const loadProviderAuthLoginRuntime = createLazyRuntimeModule(
  () => import("./provider-auth-login.runtime"),
);
const bindProviderAuthLoginRuntime = createLazyRuntimeMethodBinder(loadProviderAuthLoginRuntime);

export const githubCopilotLoginCommand = bindProviderAuthLoginRuntime(
  (runtime) => runtime.githubCopilotLoginCommand,
);
export const loginChutes = bindProviderAuthLoginRuntime((runtime) => runtime.loginChutes);
export const loginOpenAICodexOAuth = bindProviderAuthLoginRuntime(
  (runtime) => runtime.loginOpenAICodexOAuth,
);
