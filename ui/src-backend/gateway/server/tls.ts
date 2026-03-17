import type { GatewayTlsConfig } from '../../config/types.gateway';
import {
  type GatewayTlsRuntime,
  loadGatewayTlsRuntime as loadGatewayTlsRuntimeConfig,
} from '../../infra/tls/gateway';

export type { GatewayTlsRuntime } from '../../infra/tls/gateway';

export async function loadGatewayTlsRuntime(
  cfg: GatewayTlsConfig | undefined,
  log?: { info?: (msg: string) => void; warn?: (msg: string) => void },
): Promise<GatewayTlsRuntime> {
  return await loadGatewayTlsRuntimeConfig(cfg, log);
}
