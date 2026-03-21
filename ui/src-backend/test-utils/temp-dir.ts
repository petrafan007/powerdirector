import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function withTempDir<T>(prefix: string, run: (dir: string) => Promise<T>): Promise<T> {
  const dir = await fs.mkdtemp(path.join(((typeof ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp")) === "function") ? ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp"))() : "/tmp"), prefix));
  try {
    return await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
