// @ts-nocheck
import { Tool, ToolResult } from './base.ts';
import { exec } from 'node:child_process';
import util from 'node:util';
import path from 'node:path';
import os from 'node:os';

const execAsync = util.promisify(exec);

export class AndroidTool implements Tool {
    public name = 'android';
    public description = 'Control Android devices via ADB. Actions: screenshot, install_app, list_apps, notification, clipboard, screen_record, shell, file_push, file_pull, input_text.';
    public parameters = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: [
                    'screenshot', 'install_app', 'list_apps', 'notification',
                    'clipboard', 'screen_record', 'shell', 'file_push',
                    'file_pull', 'input_text', 'list_devices', 'get_info'
                ]
            },
            deviceId: { type: 'string', description: 'Target device serial (optional if single device)' },
            text: { type: 'string', description: 'Text for clipboard/input/notification' },
            title: { type: 'string', description: 'Notification title' },
            apkPath: { type: 'string', description: 'Path to APK file' },
            localPath: { type: 'string', description: 'Local file path for push/pull' },
            remotePath: { type: 'string', description: 'Remote device path for push/pull' },
            command: { type: 'string', description: 'Shell command to execute on device' },
            duration: { type: 'number', description: 'Screen record duration in seconds (max 180)', default: 10 },
            outputPath: { type: 'string', description: 'Path to save screenshot/recording' }
        },
        required: ['action']
    };

    private getAdb(deviceId?: string): string {
        return deviceId ? `adb -s ${deviceId}` : 'adb';
    }

    async execute(args: any): Promise<ToolResult> {
        try {
            // Verify ADB is available
            await execAsync('adb version');
        } catch {
            return { output: 'ADB not found. Install Android SDK Platform Tools.', isError: true };
        }

        const adb = this.getAdb(args.deviceId);

        try {
            switch (args.action) {
                case 'list_devices': {
                    const { stdout } = await execAsync('adb devices -l');
                    return { output: stdout.trim() };
                }

                case 'get_info': {
                    const model = (await execAsync(`${adb} shell getprop ro.product.model`)).stdout.trim();
                    const androidVer = (await execAsync(`${adb} shell getprop ro.build.version.release`)).stdout.trim();
                    const sdk = (await execAsync(`${adb} shell getprop ro.build.version.sdk`)).stdout.trim();
                    const battery = (await execAsync(`${adb} shell dumpsys battery`)).stdout;
                    const levelMatch = battery.match(/level: (\d+)/);
                    const batteryLevel = levelMatch ? levelMatch[1] : 'unknown';

                    return {
                        output: `Model: ${model}\nAndroid: ${androidVer} (SDK ${sdk})\nBattery: ${batteryLevel}%`
                    };
                }

                case 'screenshot': {
                    const remoteTmp = '/sdcard/screenshot.png';
                    const localOut = args.outputPath || path.join(os.tmpdir(), `android-screenshot-${Date.now()}.png`);
                    await execAsync(`${adb} shell screencap -p ${remoteTmp}`);
                    await execAsync(`${adb} pull ${remoteTmp} ${localOut}`);
                    await execAsync(`${adb} shell rm ${remoteTmp}`);
                    return { output: `Screenshot saved: ${localOut}` };
                }

                case 'screen_record': {
                    const duration = Math.min(args.duration || 10, 180);
                    const remoteTmp = '/sdcard/screenrecord.mp4';
                    const localOut = args.outputPath || path.join(os.tmpdir(), `android-record-${Date.now()}.mp4`);
                    await execAsync(`${adb} shell screenrecord --time-limit ${duration} ${remoteTmp}`, { timeout: (duration + 5) * 1000 });
                    await execAsync(`${adb} pull ${remoteTmp} ${localOut}`);
                    await execAsync(`${adb} shell rm ${remoteTmp}`);
                    return { output: `Recording saved (${duration}s): ${localOut}` };
                }

                case 'install_app': {
                    if (!args.apkPath) return { output: 'APK path required', isError: true };
                    const { stdout } = await execAsync(`${adb} install -r ${args.apkPath}`);
                    return { output: stdout.trim() };
                }

                case 'list_apps': {
                    const { stdout } = await execAsync(`${adb} shell pm list packages -3`); // -3 = third-party
                    const apps = stdout.split('\n').map((l: string) => l.replace('package:', '').trim()).filter(Boolean);
                    return { output: `Installed apps (${apps.length}):\n${apps.join('\n')}` };
                }

                case 'notification': {
                    const title = args.title || 'PowerDirector';
                    const text = args.text || 'Notification';
                    // Using am (Activity Manager) to broadcast a notification-like intent
                    // For proper notifications, a companion app would be needed
                    await execAsync(`${adb} shell am broadcast -a android.intent.action.MAIN --es title "${title}" --es text "${text}"`);
                    return { output: `Notification sent: ${title} - ${text}` };
                }

                case 'clipboard': {
                    if (args.text) {
                        // Set clipboard (requires Android 10+)
                        await execAsync(`${adb} shell input keyevent --longpress KEYCODE_HOME`);
                        await execAsync(`${adb} shell "echo '${args.text}' | am broadcast -a clipper.set"`);
                        return { output: `Clipboard set: ${args.text}` };
                    } else {
                        // Get clipboard
                        const { stdout } = await execAsync(`${adb} shell am broadcast -a clipper.get`);
                        return { output: `Clipboard: ${stdout.trim()}` };
                    }
                }

                case 'input_text': {
                    if (!args.text) return { output: 'Text required', isError: true };
                    // Escape spaces for ADB input
                    const escaped = args.text.replace(/ /g, '%s').replace(/'/g, "\\'");
                    await execAsync(`${adb} shell input text "${escaped}"`);
                    return { output: `Typed: ${args.text}` };
                }

                case 'shell': {
                    if (!args.command) return { output: 'Command required', isError: true };
                    const { stdout, stderr } = await execAsync(`${adb} shell ${args.command}`, { timeout: 30000 });
                    return { output: (stdout || stderr).trim() };
                }

                case 'file_push': {
                    if (!args.localPath || !args.remotePath) {
                        return { output: 'localPath and remotePath required', isError: true };
                    }
                    const { stdout } = await execAsync(`${adb} push ${args.localPath} ${args.remotePath}`);
                    return { output: stdout.trim() };
                }

                case 'file_pull': {
                    if (!args.remotePath) return { output: 'remotePath required', isError: true };
                    const localDest = args.localPath || path.join(os.tmpdir(), path.basename(args.remotePath));
                    const { stdout } = await execAsync(`${adb} pull ${args.remotePath} ${localDest}`);
                    return { output: `${stdout.trim()}\nSaved to: ${localDest}` };
                }

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Android Error: ${error.message}`, isError: true };
        }
    }
}
