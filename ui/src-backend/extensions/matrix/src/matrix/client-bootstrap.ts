import { createMatrixClient } from "./client/create-client";
import { startMatrixClientWithGrace } from "./client/startup";
import { getMatrixLogService } from "./sdk-runtime";

type MatrixClientBootstrapAuth = {
  homeserver: string;
  userId: string;
  accessToken: string;
  encryption?: boolean;
};

type MatrixCryptoPrepare = {
  prepare: (rooms?: string[]) => Promise<void>;
};

type MatrixBootstrapClient = Awaited<ReturnType<typeof createMatrixClient>>;

export async function createPreparedMatrixClient(opts: {
  auth: MatrixClientBootstrapAuth;
  timeoutMs?: number;
  accountId?: string;
}): Promise<MatrixBootstrapClient> {
  const client = await createMatrixClient({
    homeserver: opts.auth.homeserver,
    userId: opts.auth.userId,
    accessToken: opts.auth.accessToken,
    encryption: opts.auth.encryption,
    localTimeoutMs: opts.timeoutMs,
    accountId: opts.accountId,
  });
  if (opts.auth.encryption && client.crypto) {
    try {
      const joinedRooms = await client.getJoinedRooms();
      await (client.crypto as MatrixCryptoPrepare).prepare(joinedRooms);
    } catch {
      // Ignore crypto prep failures for one-off requests.
    }
  }
  await startMatrixClientWithGrace({
    client,
    onError: (err: unknown) => {
      const LogService = getMatrixLogService();
      LogService.error("MatrixClientBootstrap", "client.start() error:", err);
    },
  });
  return client;
}
