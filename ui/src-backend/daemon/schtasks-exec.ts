import { execFileUtf8 } from './exec-file';

export async function execSchtasks(
  args: string[],
): Promise<{ stdout: string; stderr: string; code: number }> {
  return await execFileUtf8("schtasks", args, { windowsHide: true });
}
