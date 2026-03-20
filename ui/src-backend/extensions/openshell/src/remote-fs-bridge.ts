import {
  createRemoteShellSandboxFsBridge,
  type RemoteShellSandboxHandle,
  type SandboxContext,
  type SandboxFsBridge,
} from "@/src-backend/plugin-sdk/sandbox";

export function createOpenShellRemoteFsBridge(params: {
  sandbox: SandboxContext;
  backend: RemoteShellSandboxHandle;
}): SandboxFsBridge {
  return createRemoteShellSandboxFsBridge({
    sandbox: params.sandbox,
    runtime: params.backend,
  });
}
