import type { DatabaseSync } from "node:sqlite";
import { createSubsystemLogger } from '../logging/subsystem';
import type { SessionFileEntry } from './session-files';
import {
  buildSessionEntry,
  listSessionFilesForAgent,
  sessionPathForFile,
} from './session-files';
import { indexFileEntryIfChanged } from './sync-index';
import type { SyncProgressState } from './sync-progress';
import { bumpSyncProgressCompleted, bumpSyncProgressTotal } from './sync-progress';
import { deleteStaleIndexedPaths } from './sync-stale';

const log = createSubsystemLogger("memory");

export async function syncSessionFiles(params: {
  agentId: string;
  db: DatabaseSync;
  needsFullReindex: boolean;
  progress?: SyncProgressState;
  batchEnabled: boolean;
  concurrency: number;
  runWithConcurrency: <T>(tasks: Array<() => Promise<T>>, concurrency: number) => Promise<T[]>;
  indexFile: (entry: SessionFileEntry) => Promise<void>;
  vectorTable: string;
  ftsTable: string;
  ftsEnabled: boolean;
  ftsAvailable: boolean;
  model: string;
  dirtyFiles: Set<string>;
}) {
  const files = await listSessionFilesForAgent(params.agentId);
  const activePaths = new Set(files.map((file) => sessionPathForFile(file)));
  const indexAll = params.needsFullReindex || params.dirtyFiles.size === 0;

  log.debug("memory sync: indexing session files", {
    files: files.length,
    indexAll,
    dirtyFiles: params.dirtyFiles.size,
    batch: params.batchEnabled,
    concurrency: params.concurrency,
  });

  bumpSyncProgressTotal(
    params.progress,
    files.length,
    params.batchEnabled ? "Indexing session files (batch)..." : "Indexing session files…",
  );

  const tasks = files.map((absPath) => async () => {
    if (!indexAll && !params.dirtyFiles.has(absPath)) {
      bumpSyncProgressCompleted(params.progress);
      return;
    }
    const entry = await buildSessionEntry(absPath);
    if (!entry) {
      bumpSyncProgressCompleted(params.progress);
      return;
    }
    await indexFileEntryIfChanged({
      db: params.db,
      source: "sessions",
      needsFullReindex: params.needsFullReindex,
      entry,
      indexFile: params.indexFile,
      progress: params.progress,
    });
  });

  await params.runWithConcurrency(tasks, params.concurrency);
  deleteStaleIndexedPaths({
    db: params.db,
    source: "sessions",
    activePaths,
    vectorTable: params.vectorTable,
    ftsTable: params.ftsTable,
    ftsEnabled: params.ftsEnabled,
    ftsAvailable: params.ftsAvailable,
    model: params.model,
  });
}
