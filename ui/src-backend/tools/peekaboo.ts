// @ts-nocheck
import { Tool, ToolResult } from './base';
import { exec } from 'node:child_process';
import util from 'node:util';
import os from 'node:os';
import path from 'node:path';

const execAsync = util.promisify(exec);

export class PeekabooTool implements Tool {
    public name = 'peekaboo';
    public description = 'Capture screenshots and interact with the screen. Actions: screenshot, active_window.';
    public parameters = {
        type: 'object',
        properties: {
            action: { type: 'string', enum: ['screenshot', 'active_window'] },
            outputPath: { type: 'string', description: 'Path to save screenshot' }
        },
        required: ['action']
    };

    async execute(args: any): Promise<ToolResult> {
        try {
            const outputPath = args.outputPath || path.join(os.tmpdir(), `screenshot-${Date.now()}.png`);
            const platform = os.platform();

            switch (args.action) {
                case 'screenshot': {
                    if (platform === 'darwin') {
                        await execAsync(`screencapture -x ${outputPath}`);
                    } else if (platform === 'linux') {
                        // Try multiple screenshot tools
                        try {
                            await execAsync(`import -window root ${outputPath}`); // ImageMagick
                        } catch {
                            try {
                                await execAsync(`gnome-screenshot -f ${outputPath}`);
                            } catch {
                                await execAsync(`scrot ${outputPath}`);
                            }
                        }
                    } else if (platform === 'win32') {
                        // PowerShell screenshot
                        await execAsync(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen | ForEach-Object { $bitmap = New-Object System.Drawing.Bitmap($_.Bounds.Width, $_.Bounds.Height); $graphics = [System.Drawing.Graphics]::FromImage($bitmap); $graphics.CopyFromScreen($_.Bounds.Location, [System.Drawing.Point]::Empty, $_.Bounds.Size); $bitmap.Save('${outputPath}') }"`);
                    } else {
                        return { output: `Unsupported platform: ${platform}`, isError: true };
                    }
                    return { output: `Screenshot saved: ${outputPath}` };
                }

                case 'active_window': {
                    if (platform === 'darwin') {
                        const { stdout } = await execAsync(`osascript -e 'tell application "System Events" to get name of first application process whose frontmost is true'`);
                        return { output: `Active window: ${stdout.trim()}` };
                    } else if (platform === 'linux') {
                        try {
                            const { stdout } = await execAsync(`xdotool getactivewindow getwindowname`);
                            return { output: `Active window: ${stdout.trim()}` };
                        } catch {
                            return { output: 'Could not determine active window (xdotool not found)', isError: true };
                        }
                    } else {
                        return { output: `Unsupported platform: ${platform}`, isError: true };
                    }
                }

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Peekaboo Error: ${error.message}`, isError: true };
        }
    }
}
