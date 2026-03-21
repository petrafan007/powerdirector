import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function withTempDir<T>(
  options: {
    prefix: string;
    parentDir?: string;
    subdir?: string;
  },
  run: (dir: string) => Promise<T>,
): Promise<T> {
  const base = await fs.mkdtemp(path.join(options.parentDir ?? ((typeof ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp")) === "function") ? ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp"))() : "/tmp"), options.prefix));
  const dir = options.subdir ? path.join(base, options.subdir) : base;
  if (options.subdir) {
    await fs.mkdir(dir, { recursive: true });
  }
  try {
    return await run(dir);
  } finally {
    await fs.rm(base, { recursive: true, force: true });
  }
}
