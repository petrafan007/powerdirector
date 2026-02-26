// @ts-nocheck
import { Tool, ToolResult } from './base';
import { exec } from 'node:child_process';
import util from 'node:util';
import path from 'node:path';
import os from 'node:os';

const execAsync = util.promisify(exec);

export class WindowsTool implements Tool {
    public name = 'windows';
    public description = 'Windows system control via PowerShell. Actions: screenshot, notification, clipboard, get_info, list_processes, installed_apps, registry_read, run_powershell, start_app, lock_screen.';
    public parameters = {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: [
                    'screenshot', 'notification', 'clipboard', 'get_info',
                    'list_processes', 'installed_apps', 'registry_read',
                    'run_powershell', 'start_app', 'lock_screen'
                ]
            },
            text: { type: 'string', description: 'Text for clipboard/notification body' },
            title: { type: 'string', description: 'Notification title' },
            command: { type: 'string', description: 'PowerShell command to execute' },
            appName: { type: 'string', description: 'Application name or path to start' },
            registryPath: { type: 'string', description: 'Registry key path' },
            outputPath: { type: 'string', description: 'Path to save screenshot' }
        },
        required: ['action']
    };

    private async ps(command: string, timeout: number = 30000): Promise<string> {
        // Support both native Windows and WSL2
        const isWSL = os.platform() === 'linux' && process.env.WSL_DISTRO_NAME;
        const prefix = isWSL ? 'powershell.exe' : 'powershell -NoProfile -NonInteractive';
        const { stdout } = await execAsync(`${prefix} -Command "${command.replace(/"/g, '\\"')}"`, { timeout });
        return stdout.trim();
    }

    async execute(args: any): Promise<ToolResult> {
        const platform = os.platform();
        const isWSL = platform === 'linux' && !!process.env.WSL_DISTRO_NAME;

        if (platform !== 'win32' && !isWSL) {
            return { output: 'Windows tool requires Windows or WSL2.', isError: true };
        }

        try {
            switch (args.action) {
                case 'get_info': {
                    const osName = await this.ps("(Get-CimInstance Win32_OperatingSystem).Caption");
                    const osVer = await this.ps("(Get-CimInstance Win32_OperatingSystem).Version");
                    const cpu = await this.ps("(Get-CimInstance Win32_Processor).Name");
                    const ramGB = await this.ps("[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 2)");
                    const hostname = await this.ps("$env:COMPUTERNAME");
                    const username = await this.ps("$env:USERNAME");

                    return {
                        output: `Hostname: ${hostname}\nUser: ${username}\nOS: ${osName}\nVersion: ${osVer}\nCPU: ${cpu}\nRAM: ${ramGB} GB`
                    };
                }

                case 'screenshot': {
                    const outputPath = args.outputPath || path.join(os.tmpdir(), `win-screenshot-${Date.now()}.png`);
                    const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bitmap = New-Object System.Drawing.Bitmap($screen.Bounds.Width, $screen.Bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($screen.Bounds.Location, [System.Drawing.Point]::Empty, $screen.Bounds.Size)
$bitmap.Save('${outputPath.replace(/\\/g, '\\\\')}')
$graphics.Dispose()
$bitmap.Dispose()
                    `.trim().replace(/\n/g, '; ');
                    await this.ps(psScript);
                    return { output: `Screenshot saved: ${outputPath}` };
                }

                case 'notification': {
                    const title = (args.title || 'PowerDirector').replace(/'/g, "''");
                    const text = (args.text || 'Notification').replace(/'/g, "''");
                    const psScript = `
[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
$template = @'
<toast>
    <visual>
        <binding template="ToastGeneric">
            <text>${title}</text>
            <text>${text}</text>
        </binding>
    </visual>
</toast>
'@
$xml = New-Object Windows.Data.Xml.Dom.XmlDocument
$xml.LoadXml($template)
$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('PowerDirector').Show($toast)
                    `.trim().replace(/\n/g, '; ');
                    try {
                        await this.ps(psScript);
                    } catch {
                        // Fallback to BurntToast or msg.exe
                        await this.ps(`msg * /time:5 '${text}'`);
                    }
                    return { output: `Notification sent: ${args.title || 'PowerDirector'} - ${args.text}` };
                }

                case 'clipboard': {
                    if (args.text) {
                        await this.ps(`Set-Clipboard -Value '${args.text.replace(/'/g, "''")}'`);
                        return { output: `Clipboard set: ${args.text}` };
                    } else {
                        const content = await this.ps('Get-Clipboard');
                        return { output: `Clipboard: ${content}` };
                    }
                }

                case 'list_processes': {
                    const result = await this.ps("Get-Process | Sort-Object -Property CPU -Descending | Select-Object -First 20 Name, Id, CPU, @{N='MemMB';E={[math]::Round($_.WorkingSet64/1MB,1)}} | Format-Table -AutoSize | Out-String");
                    return { output: result };
                }

                case 'installed_apps': {
                    const result = await this.ps("Get-ItemProperty HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\* | Select-Object DisplayName, DisplayVersion, Publisher | Where-Object { $_.DisplayName } | Sort-Object DisplayName | Format-Table -AutoSize | Out-String");
                    return { output: result };
                }

                case 'registry_read': {
                    if (!args.registryPath) return { output: 'Registry path required', isError: true };
                    const result = await this.ps(`Get-ItemProperty -Path '${args.registryPath}' | Format-List | Out-String`);
                    return { output: result };
                }

                case 'run_powershell': {
                    if (!args.command) return { output: 'Command required', isError: true };
                    const result = await this.ps(args.command);
                    return { output: result || '(no output)' };
                }

                case 'start_app': {
                    if (!args.appName) return { output: 'App name required', isError: true };
                    await this.ps(`Start-Process '${args.appName.replace(/'/g, "''")}'`);
                    return { output: `Started: ${args.appName}` };
                }

                case 'lock_screen': {
                    await this.ps('rundll32.exe user32.dll,LockWorkStation');
                    return { output: 'Screen locked.' };
                }

                default:
                    return { output: `Unknown action: ${args.action}`, isError: true };
            }
        } catch (error: any) {
            return { output: `Windows Error: ${error.message}`, isError: true };
        }
    }
}
