import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function makeTempWorkspace(prefix = "powerdirector-workspace-"): Promise<string> {
  return fs.mkdtemp(path.join(((typeof ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp")) === "function") ? ((typeof os.tmpdir === "function") ? os.tmpdir : (() => "/tmp"))() : "/tmp"), prefix));
}

export async function writeWorkspaceFile(params: {
  dir: string;
  name: string;
  content: string;
}): Promise<string> {
  const filePath = path.join(params.dir, params.name);
  await fs.writeFile(filePath, params.content, "utf-8");
  return filePath;
}
